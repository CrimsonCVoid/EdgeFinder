package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
public class PlayersController {
    private final WebClient mlbClient;

    public PlayersController(WebClient.Builder builder) {
        this.mlbClient = builder
                .baseUrl("https://statsapi.mlb.com/api/v1")
                .build();
    }

    @GetMapping("/api/players")
    public Mono<JsonNode> getRoster(@RequestParam("teamName") String teamName,
                                    @RequestParam(value = "season", defaultValue = "2025") String season) {
        return mlbClient.get()
                .uri(uri -> uri.path("/teams")
                        .queryParam("season", season)
                        .queryParam("sportId", 1)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(teams -> {
                    int teamId = -1;
                    for (JsonNode team : teams.path("teams")) {
                        if (team.path("name").asText().equalsIgnoreCase(teamName)) {
                            teamId = team.path("id").asInt();
                            break;
                        }
                    }
                    if (teamId == -1) {
                        return Mono.error(new IllegalArgumentException("Team not found"));
                    }
                    return mlbClient.get()
                            .uri("/teams/" + teamId + "/roster?rosterType=active")
                            .retrieve()
                            .bodyToMono(JsonNode.class);
                });
    }
}