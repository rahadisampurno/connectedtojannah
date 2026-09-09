import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../widgets/ctj_widgets.dart';
import '../home/home_shell.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});
  @override Widget build(BuildContext context) => Scaffold(body: CtJWorldScene(child: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(24, 54, 24, 28), child: Column(children: [
    const Spacer(),
    const Icon(Icons.auto_awesome, color: CtJColors.gold, size: 42),
    const SizedBox(height: 18),
    Text('Connected\nto Jannah', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 48, height: .9)),
    const SizedBox(height: 18),
    const Text('Bersama di dunia, menuju Jannah.', textAlign: TextAlign.center, style: TextStyle(fontSize: 17)),
    const Spacer(flex: 2),
    SizedBox(width: double.infinity, height: 54, child: FilledButton(style: FilledButton.styleFrom(backgroundColor: CtJColors.ivory, foregroundColor: CtJColors.ink), onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeShell())), child: const Text('Mulai Perjalanan'))),
    const SizedBox(height: 12),
    const Text('Progress menggambarkan aktivitas di aplikasi, bukan nilai amal.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.white70)),
  ])))));
}
