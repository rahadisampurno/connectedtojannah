import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'features/onboarding/onboarding_screen.dart';

class CtJApp extends StatelessWidget {
  const CtJApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(debugShowCheckedModeBanner: false, title: 'Connected to Jannah', theme: ctjTheme(), home: const OnboardingScreen());
}
