package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class MultiFactorWinProbabilityService {
    private static final Logger log = LoggerFactory.getLogger(MultiFactorWinProbabilityService.class);
    private final WebClient mlb;

    public MultiFactorWinProbabilityService(WebClient.Builder builder) {
        this.mlb = builder
          .baseUrl("https://statsapi.mlb.com/api/v1")
          .build();
    }

    /**  
     * Entry point: takes date, home & away names from the payload,
     * finds the MLB gamePk, then delegates to compute().
     */
    public WinProb computeByApiSports(Map<String,String> body) {
        String date    = body.get("date");    // e.g. "2025-04-23"
        String homeName = body.get("home");
        String awayName = body.get("away");

        // 1) Fetch MLB schedule for that date (hydrate teams)
        JsonNode sched = mlb.get()
            .uri(uri -> uri
                .path("/schedule")
                .queryParam("date",    date)
                .queryParam("sportId","1")
                .queryParam("hydrate","teams")
                .build())
            .retrieve().bodyToMono(JsonNode.class).block();

        // 2) Find the matching gamePk by team names
        JsonNode games = sched.path("dates").get(0).path("games");
        String gamePk = null;
        for (JsonNode g : games) {
            String h = g.path("teams").path("home").path("team").path("name").asText();
            String a = g.path("teams").path("away").path("team").path("name").asText();
            if (h.equalsIgnoreCase(homeName) && a.equalsIgnoreCase(awayName)) {
                gamePk = g.path("gamePk").asText();
                break;
            }
        }
        if (gamePk == null) {
            log.error("Could not find gamePk for {} vs {} on {}", homeName, awayName, date);
            throw new RuntimeException("Game not found");
        }

        return compute(gamePk);
    }

    /**
     * Core blending logic given a gamePk.
     */
    public WinProb compute(String gamePk) {
        // 1) Live contextMetrics
        JsonNode ctx = mlb.get()
          .uri("/game/{pk}/contextMetrics", gamePk)
          .retrieve().bodyToMono(JsonNode.class).block();
        double liveHome = ctx.path("homeWinProbability").asDouble() / 100.0;
        // (we don’t need liveAway here)

        // 2) Season PCT via standings + boxscore
        JsonNode std = mlb.get()
          .uri("/standings?leagueId=1&season=2025")
          .retrieve().bodyToMono(JsonNode.class).block();
        JsonNode box = mlb.get()
          .uri("/game/{pk}/boxscore", gamePk)
          .retrieve().bodyToMono(JsonNode.class).block();
        int homeId = box.path("teams").path("home").path("team").path("id").asInt();

        double seasonHome = 0.5;
        for (JsonNode rec : std.path("records")) {
            for (JsonNode tr : rec.path("teamRecords")) {
                if (tr.path("team").path("id").asInt() == homeId) {
                    double w = tr.path("wins").asDouble();
                    double l = tr.path("losses").asDouble();
                    seasonHome = w / (w + l);
                    break;
                }
            }
        }

        // 3) Pace adj → fallback to 0.5 if unsupported
        double paceAdj;
        try {
            JsonNode pace = mlb.get()
              .uri(uri -> uri
                  .path("/gamePace")                // correct endpoint
                  .queryParam("season", "2025")
                  .build())
              .retrieve().bodyToMono(JsonNode.class).block();
            double paceVal = pace.path("leagues").get(0)
                                 .path("pace").path("value")
                                 .asDouble();
            paceAdj = 1/(1+Math.exp(-(paceVal-2.5))) * 0.1 + 0.45;
        } catch (Exception ex) {
            log.warn("Pace unavailable, defaulting to 0.5", ex);
            paceAdj = 0.5;
        }

        // 4) Blend: 70% live, 25% season, 5% pace
        double homeProb = 0.7 * liveHome
                        + 0.25 * seasonHome
                        + 0.05 * paceAdj;
        double awayProb = 1 - homeProb;

        return new WinProb(homeProb, awayProb, liveHome, seasonHome, paceAdj);
    }

    public static class WinProb {
        public final double homeProb, awayProb;
        public final double liveHomePct, seasonHomePct, paceAdj;
        public WinProb(double h, double a, double l, double s, double p) {
            homeProb      = h;
            awayProb      = a;
            liveHomePct   = l;
            seasonHomePct = s;
            paceAdj       = p;
        }
    }
}
