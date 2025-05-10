package com.edgefinder;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class GamesController {
    private final GamesService gamesService;

    public GamesController(GamesService gamesService) {
        this.gamesService = gamesService;
    }

    @GetMapping("/api/games")
    public Mono<String> getGames(
            @RequestParam("date") String date,
            @RequestParam(value = "league", defaultValue = "1") String league,
            @RequestParam(value = "season", defaultValue = "2025") String season,
            @RequestParam(value = "timezone") String timezone
    ) {
        return gamesService.fetchGames(date, league, season, timezone);
    }
}