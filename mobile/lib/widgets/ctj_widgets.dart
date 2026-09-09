import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/theme.dart';

class CtJWorldScene extends StatefulWidget {
  const CtJWorldScene({super.key, this.energy = 0, this.child});
  final int energy;
  final Widget? child;
  @override State<CtJWorldScene> createState() => _CtJWorldSceneState();
}
class _CtJWorldSceneState extends State<CtJWorldScene> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(vsync: this, duration: const Duration(seconds: 14))..repeat();
  @override void dispose() { controller.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    if (reduce) controller.stop();
    return Stack(fit: StackFit.expand, children: [
      Image.asset('assets/images/journey_world_hero_v1.png', fit: BoxFit.cover, alignment: Alignment.center),
      Container(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [CtJColors.midnight.withOpacity(.12), CtJColors.midnight.withOpacity(.15), CtJColors.midnight.withOpacity(.9)]))),
      if (!reduce) AnimatedBuilder(animation: controller, builder: (_, __) => CustomPaint(painter: _Stars(controller.value, widget.energy))),
      if (widget.child != null) widget.child!,
    ]);
  }
}
class _Stars extends CustomPainter {
  _Stars(this.t, this.energy); final double t; final int energy;
  @override void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = CtJColors.gold.withOpacity(.25 + energy / 250);
    for (var i=0; i<16; i++) { final x=(i*71.0)%size.width; final y=(i*43.0 + math.sin(t*math.pi*2+i)*8)%size.height*.7; canvas.drawCircle(Offset(x,y), 1+(i%3)*.6, paint); }
  }
  @override bool shouldRepaint(covariant _Stars old) => old.t != t || old.energy != energy;
}

class CtJProgress extends StatelessWidget {
  const CtJProgress({super.key, required this.value}); final int value;
  @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('$value%', style: const TextStyle(fontSize: 36, fontFamily: 'serif', fontWeight: FontWeight.bold)), const SizedBox(height: 8), ClipRRect(borderRadius: BorderRadius.circular(12), child: LinearProgressIndicator(value: value/100, minHeight: 9, color: CtJColors.teal, backgroundColor: Colors.white24, semanticsLabel: 'Progress hari ini', semanticsValue: '$value persen'))]);
}

class CtJCard extends StatelessWidget {
  const CtJCard({super.key, required this.child}); final Widget child;
  @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: CtJColors.deepNavy.withOpacity(.88), borderRadius: BorderRadius.circular(24), border: Border.all(color: CtJColors.gold.withOpacity(.35))), child: child);
}
