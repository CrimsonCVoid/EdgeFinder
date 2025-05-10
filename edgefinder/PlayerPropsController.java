package com.edgefinder;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Controller to expose player prop endpoints
 */
@RestController
@RequestMapping("/api")
public class PlayerPropsController {

    private final PlayerPropsService propsService = new PlayerPropsService();

    @GetMapping("/props")
    public ResponseEntity<List<PropDto>> getPlayerProps(
            @RequestParam("playerId") Long playerId) {
        // Delegate to service to compute list of prop DTOs
        List<PropDto> props = propsService.computeProps(playerId);
        return ResponseEntity.ok(props);
    }
}

/**
 * Service encapsulating all prop computations for a player
 */
@Service
class PlayerPropsService {

    private static final String BASE_URL = "https://statsapi.mlb.com/api/v1";
    private static final String SEASON = "2025";
    private final RestTemplate restClient = new RestTemplate();

    /**
     * Computes a list of PropDto for various statistics
     */
    public List<PropDto> computeProps(Long playerId) {
        // 1) Fetch season aggregates
        Map<String, Object> seasonResponse = fetchSeasonStats(playerId);
        Map<String, Object> seasonStats = extractFirstSplitStats(seasonResponse);

        // extract individual season stat values
        int hits = getStatValue(seasonStats, "hits");
        int atBats = getStatValue(seasonStats, "atBats");
        int walks = getStatValue(seasonStats, "baseOnBalls");
        int strikeOuts = getStatValue(seasonStats, "strikeOuts");
        int runs = getStatValue(seasonStats, "runs");
        int rbi = getStatValue(seasonStats, "rbi");
        int errors = getStatValue(seasonStats, "errors");

        // 2) Fetch game log to get total games and games with a hit
        Map<String, Object> logResponse = fetchGameLog(playerId);
        List<Map<String, Object>> gameLogSplits = extractLogSplits(logResponse);
        int totalGames = gameLogSplits.size();
        int gamesWithHit = countGamesWithStat(gameLogSplits, "hits");

        // 3) Build a list of PropDto objects
        List<PropDto> propList = new ArrayList<>();
        propList.add(computeHitsProp(hits, atBats));
        propList.add(computeObpProp(hits, walks, atBats, walks, strikeOuts));
        propList.add(computeRbiPerGameProp(rbi, totalGames));
        propList.add(computeRunsPerGameProp(runs, totalGames));
        propList.add(computeWalksPerGameProp(walks, totalGames));
        propList.add(computeStrikeoutsPerGameProp(strikeOuts, totalGames));
        propList.add(computeErrorsPerGameProp(errors, totalGames));
        propList.add(computeGamesWithHitProp(gamesWithHit, totalGames));

        return propList;
    }

    // ---------- Season data fetching ----------

    private Map<String, Object> fetchSeasonStats(Long playerId) {
        String url = String.format(
            "%s/people/%d/stats?stats=season&season=%s&gameType=R",
            BASE_URL, playerId, SEASON
        );
        return restClient.getForObject(url, Map.class);
    }

    private Map<String, Object> extractFirstSplitStats(Map<String, Object> response) {
        List<?> statsList = (List<?>) response.get("stats");
        if (statsList.isEmpty()) {
            return Map.of();
        }
        Map<?,?> firstStats = (Map<?,?>) statsList.get(0);
        List<?> splits = (List<?>) firstStats.get("splits");
        if (splits.isEmpty()) {
            return Map.of();
        }
        Map<?,?> split = (Map<?,?>) splits.get(0);
        return (Map<String, Object>) split.get("stat");
    }

    private int getStatValue(Map<String, Object> stats, String key) {
        Object val = stats.get(key);
        if (val instanceof Number) {
            return ((Number) val).intValue();
        }
        try {
            return Integer.parseInt(val.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    // ---------- Game log fetching ----------

    private Map<String, Object> fetchGameLog(Long playerId) {
        String url = String.format(
            "%s/people/%d/stats?stats=gameLog&season=%s&gameType=R",
            BASE_URL, playerId, SEASON
        );
        return restClient.getForObject(url, Map.class);
    }

    private List<Map<String, Object>> extractLogSplits(Map<String, Object> response) {
        List<?> statsList = (List<?>) response.get("stats");
        if (statsList.isEmpty()) return List.of();
        Map<?,?> firstStats = (Map<?,?>) statsList.get(0);
        List<?> splits = (List<?>) firstStats.get("splits");
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object s : splits) {
            result.add((Map<String, Object>) s);
        }
        return result;
    }

    private int countGamesWithStat(
            List<Map<String, Object>> gameLogSplits, String statKey) {
        int count = 0;
        for (Map<String, Object> entry : gameLogSplits) {
            Map<String, Object> stat = (Map<String, Object>) entry.get("stat");
            int value = getStatValue(stat, statKey);
            if (value > 0) count++;
        }
        return count;
    }

    // ---------- Individual prop computations ----------

    private PropDto computeHitsProp(int hits, int atBats) {
        String odds = formatAmericanOdds(hits, atBats);
        return new PropDto("Hits/AB", hits, atBats, odds);
    }

    private PropDto computeObpProp(
            int hits, int walks, int atBats, int walks2, int strikeOuts) {
        int numerator = hits + walks;
        int denominator = atBats + walks2 + strikeOuts;
        String odds = formatAmericanOdds(numerator, denominator);
        return new PropDto("OBP", numerator, denominator, odds);
    }

    private PropDto computeRbiPerGameProp(int rbi, int games) {
        String odds = formatAmericanOdds(rbi, games);
        return new PropDto("RBI/Game", rbi, games, odds);
    }

    private PropDto computeRunsPerGameProp(int runs, int games) {
        String odds = formatAmericanOdds(runs, games);
        return new PropDto("Runs/Game", runs, games, odds);
    }

    private PropDto computeWalksPerGameProp(int walks, int games) {
        String odds = formatAmericanOdds(walks, games);
        return new PropDto("Walks/Game", walks, games, odds);
    }

    private PropDto computeStrikeoutsPerGameProp(int strikeOuts, int games) {
        String odds = formatAmericanOdds(strikeOuts, games);
        return new PropDto("K's/Game", strikeOuts, games, odds);
    }

    private PropDto computeErrorsPerGameProp(int errors, int games) {
        String odds = formatAmericanOdds(errors, games);
        return new PropDto("Errors/Game", errors, games, odds);
    }

    private PropDto computeGamesWithHitProp(int withHit, int games) {
        String odds = formatAmericanOdds(withHit, games);
        return new PropDto("Games w/Hit", withHit, games, odds);
    }

    /**
     * Convert fraction made/att to American odds string
     */
    private String formatAmericanOdds(int made, int att) {
        if (att <= 0) {
            return "-";
        }
        BigDecimal probability = BigDecimal.valueOf(made)
            .divide(BigDecimal.valueOf(att), 4, RoundingMode.HALF_UP);
        if (probability.compareTo(BigDecimal.ZERO) == 0) {
            return "-";
        }
        BigDecimal decimalOdds = BigDecimal.ONE.divide(probability, 4, RoundingMode.HALF_UP);

        // format based on decimalOdds
        if (decimalOdds.compareTo(BigDecimal.ONE) <= 0) {
            return "EVEN";
        }
        BigDecimal diff = decimalOdds.subtract(BigDecimal.ONE);

        if (decimalOdds.compareTo(BigDecimal.valueOf(2)) >= 0) {
            // + odds for underdog
            BigDecimal positive = diff.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP);
            return "+" + positive.toPlainString();
        } else {
            // - odds for favorite
            BigDecimal negative = BigDecimal.valueOf(100)
                .divide(diff, 0, RoundingMode.HALF_UP);
            return "-" + negative.toPlainString();
        }
    }
}

/**
 * Data Transfer Object representing one prop
 */
class PropDto {
    public String label;
    public int made;
    public int att;
    public String odds;

    public PropDto(String label, int made, int att, String odds) {
        this.label = label;
        this.made = made;
        this.att = att;
        this.odds = odds;
    }
}