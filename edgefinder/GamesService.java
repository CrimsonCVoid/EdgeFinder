package com.edgefinder;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class GamesService {
    private final WebClient client;

    public GamesService(
            WebClient.Builder builder,
            @Value("${apisports.key}") String apiKey,
            @Value("${apisports.host}") String host
    ) {
        this.client = builder
                .baseUrl("https://" + host)
                .defaultHeader("x-apisports-key", apiKey)
                .build();
    }

    public Mono<String> fetchGames(String date,
                                   String league,
                                   String season,
                                   String timezone) {
        return client.get()
                .uri(uri -> uri
                        .path("/games")
                        .queryParam("date", date)
                        .queryParam("league", league)
                        .queryParam("season", season)
                        .queryParam("timezone", timezone)
                        .build())
                .retrieve()
                .bodyToMono(String.class);
    }
}