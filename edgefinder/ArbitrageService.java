// src/main/java/com/edgefinder/ArbitrageService.java
package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Service
public class ArbitrageService {
    private final WebClient client;

    public ArbitrageService(WebClient.Builder builder,
                            @Value("${apisports.host}") String host,
                            @Value("${apisports.key}") String apiKey) {
        this.client = builder
            .baseUrl("https://" + host)
            .defaultHeader("x-apisports-key", apiKey)
            .build();
    }

    /**
     * Fetches **all** bookmakers’ expected‐value (EV) for the given gameId,
     * regardless of sign. Returned maps will have:
     *   gameId, bookmaker, homeOdds, awayOdds, evHomePercent, evAwayPercent
     */
    public List<Map<String,Object>> findEvsForGame(String gameId) {
        List<Map<String,Object>> evs = new ArrayList<>();

        // 1) Get odds for that game
        JsonNode oddsRoot = client.get()
            .uri(uri -> uri.path("/odds")
                .queryParam("game", gameId)
                .build())
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        JsonNode resp = oddsRoot.path("response");
        if (!resp.isArray() || resp.isEmpty()) {
            return evs; // no odds at all
        }

        JsonNode books = resp.get(0).path("bookmakers");
        if (!books.isArray() || books.isEmpty()) {
            return evs; // no bookmakers
        }

        // 2) Find Pinnacle to compute implied probabilities
        Optional<JsonNode> pin = findBook(books, "Pinnacle");
        if (pin.isEmpty()) {
            return evs; // no Pinnacle → can’t compute EV
        }
        JsonNode pinVals = pin.get().path("bets").get(0).path("values");
        double pinHome = safeParse(pinVals.get(0).path("odd").asText());
        double pinAway = safeParse(pinVals.get(1).path("odd").asText());
        double impHome = 1.0 / pinHome;
        double impAway = 1.0 / pinAway;

        // 3) For **every** bookmaker (including those with negative EV), compute EV
        for (JsonNode book : books) {
            String name = book.path("name").asText();
            JsonNode vals = book.path("bets").get(0).path("values");
            if (!vals.isArray() || vals.size() < 2) continue;

            double oHome = safeParse(vals.get(0).path("odd").asText());
            double oAway = safeParse(vals.get(1).path("odd").asText());
            double evHome = (impHome - (1.0 / oHome)) * 100;
            double evAway = (impAway - (1.0 / oAway)) * 100;

            Map<String,Object> entry = new LinkedHashMap<>();
            entry.put("gameId",        gameId);
            entry.put("bookmaker",     name);
            entry.put("homeOdds",      oHome);
            entry.put("awayOdds",      oAway);
            entry.put("evHomePercent", evHome);
            entry.put("evAwayPercent", evAway);
            evs.add(entry);
        }

        return evs;
    }

    private Optional<JsonNode> findBook(JsonNode books, String target) {
        for (JsonNode b : books) {
            if (target.equalsIgnoreCase(b.path("name").asText())) {
                return Optional.of(b);
            }
        }
        return Optional.empty();
    }

    private double safeParse(String s) {
        try { return Double.parseDouble(s); }
        catch (Exception e) { return 0.0; }
    }
}
