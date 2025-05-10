// src/main/java/com/edgefinder/H2HController.java
package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class H2HController {
    private final WebClient client;

    public H2HController(WebClient.Builder builder,
                         @Value("${apisports.key}") String apiKey,
                         @Value("${apisports.host}") String host) {
        this.client = builder
                .baseUrl("https://" + host)
                .defaultHeader("x-apisports-key", apiKey)
                .build();
    }

    @GetMapping("/h2h")
    public Mono<JsonNode> getH2H(
            @RequestParam String homeId,
            @RequestParam String awayId,
            @RequestParam String season,
            @RequestParam(defaultValue = "1") String league
    ) {
        return client.get()
                .uri(uri -> uri.path("/games/h2h")
                        .queryParam("h2h", homeId + "-" + awayId)
                        .queryParam("league", league)
                        .queryParam("season", season)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class);
    }
}
