package com.edgefinder;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class MultiFactorWinProbabilityController {
    private final MultiFactorWinProbabilityService svc;

    public MultiFactorWinProbabilityController(MultiFactorWinProbabilityService svc) {
        this.svc = svc;
    }

    /** 
     * Single “easy” endpoint: pass date/home/away, get back full WinProb 
     */
    @PostMapping("/predict")
    public ResponseEntity<MultiFactorWinProbabilityService.WinProb> predict(
        @RequestBody Map<String, String> body
    ) {
        var result = svc.computeByApiSports(body);
        return ResponseEntity.ok(result);
    }
}
