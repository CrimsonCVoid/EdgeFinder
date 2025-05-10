// src/main/java/com/edgefinder/ArbitrageController.java
package com.edgefinder;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class ArbitrageController {
    private final ArbitrageService service;

    public ArbitrageController(ArbitrageService service) {
        this.service = service;
    }

    @GetMapping("/api/expected-value")
    public List<Map<String,Object>> getAllEvs(@RequestParam String gameId) {
        return service.findEvsForGame(gameId);
    }
}
