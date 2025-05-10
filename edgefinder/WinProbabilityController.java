package com.edgefinder;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class WinProbabilityController {
    private final WinProbabilityService svc;

    public WinProbabilityController(WinProbabilityService svc) {
        this.svc = svc;
    }

    @PostMapping("/api/multiPredict")
    public ResponseEntity<WinProbabilityService.WinProbResponse> multiPredict(
            @RequestBody Map<String, String> body
    ) {
        var resp = svc.computeWinProb(body.get("gameId"));
        return ResponseEntity.ok(resp);
    }
}
