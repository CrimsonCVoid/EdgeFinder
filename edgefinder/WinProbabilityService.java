package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class WinProbabilityService {
    private static final Logger log = LoggerFactory.getLogger(WinProbabilityService.class);
    private final WebClient client;

    public WinProbabilityService(
            WebClient.Builder builder,
            @Value("${sportsradar.api.key}") String apiKey,
            @Value("${sportsradar.host}") String host,
            @Value("${sportsradar.mlb.ver}") String mlbVer,
            @Value("${sportsradar.odds.ver}") String oddsVer
    ) {
        this.client = builder
                .baseUrl("https://" + host)
                .defaultHeader("Api-Key", apiKey)
                .build();
        this.mlbVer = mlbVer;
        this.oddsVer = oddsVer;
    }

    private final String mlbVer;
    private final String oddsVer;

    public WinProbResponse computeWinProb(String eventId) {
        try {
            double pinnacle = fetchPinnacle(eventId);
            double season   = fetchSeasonPct(eventId);
            double h2h      = fetchH2HPct(eventId);
            double homeProb = 0.5 * pinnacle + 0.3 * season + 0.2 * h2h;
            double awayProb = 1 - homeProb;
            return new WinProbResponse(
                    String.format("%.1f%%", homeProb * 100),
                    String.format("%.1f%%", awayProb * 100),
                    pinnacle, season, h2h
            );
        } catch (Exception ex) {
            log.error("Error computing win prob for {}", eventId, ex);
            throw new RuntimeException(ex);
        }
    }

private double fetchPinnacle(String eid) {
    JsonNode root = client.get()
        .uri(uri -> uri
            .path("/oddscomparison/{ver}/prematch/{eid}/bookmakers.json")
            .build(oddsVer, eid))
        .retrieve().bodyToMono(JsonNode.class).block();

    for (JsonNode bm : root.path("data").path("bookmakers")) {
        if ("Pinnacle".equals(bm.path("name").asText())) {
            double dec = bm.path("bets").get(0).path("values").get(0).path("decimal").asDouble();
            return 1.0 / dec;
        }
    }
    return 0.5; // fallback if Pinnacle not found
}

    private double fetchSeasonPct(String eid) {
        JsonNode sum = client.get()
                .uri(uri -> uri
                        .path("/v3/mlb/games/{eid}/summary.json")
                        .build(mlbVer, eid))
                .retrieve().bodyToMono(JsonNode.class).block();
        String sid = sum.path("data").path("sport_event").path("season").path("id").asText();
        String hid = sum.path("data").path("sport_event").path("competitors").get(0).path("id").asText();
        JsonNode stand = client.get()
                .uri(uri -> uri
                        .path("/v3/mlb/seasons/{sid}/standings.json")
                        .build(mlbVer, sid))
                .retrieve().bodyToMono(JsonNode.class).block();
        for (JsonNode rec : stand.path("data").path("records")) {
            if (hid.equals(rec.path("team_id").asText())) {
                double w = rec.path("wins").asDouble();
                double l = rec.path("losses").asDouble();
                return w / (w + l);
            }
        }
        return 0.5;
    }

    private double fetchH2HPct(String eid) {
        JsonNode h2h = client.get()
                .uri(uri -> uri
                        .path("/v3/mlb/games/{eid}/h2h.json")
                        .build(mlbVer, eid))
                .retrieve().bodyToMono(JsonNode.class).block();
        int hw = h2h.path("data").path("home_wins").asInt();
        int aw = h2h.path("data").path("away_wins").asInt();
        return (hw + aw) > 0 ? (double) hw / (hw + aw) : 0.5;
    }

    public static class WinProbResponse {
        public final String homeWinProbability;
        public final String awayWinProbability;
        public final double pinnacleProb;
        public final double seasonProb;
        public final double h2hProb;

        public WinProbResponse(String homeWinProbability,
                                String awayWinProbability,
                                double pinnacleProb,
                                double seasonProb,
                                double h2hProb) {
            this.homeWinProbability = homeWinProbability;
            this.awayWinProbability = awayWinProbability;
            this.pinnacleProb       = pinnacleProb;
            this.seasonProb         = seasonProb;
            this.h2hProb            = h2hProb;
        }
    }
}
