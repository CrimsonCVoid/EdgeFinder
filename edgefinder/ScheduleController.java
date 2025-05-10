// ScheduleController.java
package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
public class ScheduleController {
    private final WebClient mlbClient;

    public ScheduleController(WebClient.Builder builder) {
        this.mlbClient = builder.baseUrl("https://statsapi.mlb.com/api/v1").build();
    }

    @GetMapping("/api/schedule")
    public Mono<JsonNode> getSchedule(@RequestParam String date) {
        return mlbClient.get()
                .uri(uri -> uri.path("/schedule")
                        .queryParam("date", date)
                        .queryParam("sportId", "1")
                        .queryParam("hydrate", "linescore")
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    @GetMapping("/api/contextMetrics")
    public Mono<JsonNode> getContextMetrics(@RequestParam String gamePk) {
        return mlbClient.get()
                .uri("/game/{pk}/contextMetrics", gamePk)
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    @GetMapping("/api/boxscore")
    public Mono<JsonNode> getBoxscore(@RequestParam String gamePk) {
        return mlbClient.get()
                .uri("/game/{pk}/boxscore", gamePk)
                .retrieve()
                .bodyToMono(JsonNode.class);
    }
}
