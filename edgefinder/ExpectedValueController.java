package com.edgefinder;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ExpectedValueController {
    private final ArbitrageService arbitrageService;

    public ExpectedValueController(ArbitrageService arbitrageService) {
        this.arbitrageService = arbitrageService;
    }

    /**
     * GET /api/expected-value?gameId=12345
     * Returns a List of maps with keys:
     *   gameId, bookmaker, homeOdds, awayOdds, evHomePercent, evAwayPercent
     */
    @GetMapping("/expected-value")
    public ResponseEntity<List<Map<String,Object>>> getExpectedValue(
            @RequestParam("gameId") String gameId
    ) {
        var evs = arbitrageService.findEvsForGame(gameId);
        return ResponseEntity.ok(evs);
    }
}
