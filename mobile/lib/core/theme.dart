import 'package:flutter/material.dart';

abstract final class CtJColors {
  static const midnight = Color(0xFF0D2A4A);
  static const deepNavy = Color(0xFF143B63);
  static const gold = Color(0xFFD9B66F);
  static const teal = Color(0xFF3E9E9A);
  static const ivory = Color(0xFFF7F2E8);
  static const ink = Color(0xFF183044);
}

ThemeData ctjTheme() => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(seedColor: CtJColors.gold, brightness: Brightness.dark, surface: CtJColors.deepNavy),
  scaffoldBackgroundColor: CtJColors.midnight,
  textTheme: const TextTheme(headlineLarge: TextStyle(fontFamily: 'serif', fontWeight: FontWeight.w600, color: CtJColors.ivory), bodyMedium: TextStyle(color: CtJColors.ivory, height: 1.4)),
);
