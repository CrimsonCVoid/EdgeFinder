package com.edgefinder;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
public class OddsController {
    private final WebClient client;

    public OddsController(WebClient.Builder builder, 
                          @Value("${apisports.key}") String apiKey,
                          @Value("${apisports.host}") String host) {
        this.client = builder
            .baseUrl("https://" + host)
            .defaultHeader("x-apisports-key", apiKey)
            .build();
    }

    @GetMapping("/api/odds")
    public Mono<JsonNode> getOdds(@RequestParam("gameId") String gameId) {
        return client.get()
            .uri(uri -> uri.path("/odds").queryParam("game", gameId).build())
            .retrieve()
            .bodyToMono(JsonNode.class);
    }
}