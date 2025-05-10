package com.edgefinder;    // ← adjust to your package!

import java.util.Scanner;

public class EvCli {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);

        System.out.print("Enter the true probability (decimal, e.g. 0.55): ");
        double trueProb = in.nextDouble();

        System.out.print("Enter the American odds (e.g. +150 or -110): ");
        int odds = in.nextInt();

        double ev = calculateEv(trueProb, odds);
        System.out.printf("Expected value: %.2f%%%n", ev * 100);

        in.close();
    }

    // exactly the same logic you have in JS:
    public static double calculateEv(double trueProb, int odds) {
        double implied = (odds > 0)
            ? 100.0 / (odds + 100.0)
            : -odds / (100.0 + -odds);
        return trueProb - implied;
    }
}
