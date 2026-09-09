class DailyEntry {
  DailyEntry({required this.id, required this.title, required this.note, required this.period, required this.current, required this.target, required this.completed});
  final String id, title, note, period;
  final int current, target;
  final bool completed;
  factory DailyEntry.fromJson(Map<String, dynamic> json) => DailyEntry(id: json['id'], title: json['title'], note: json['note'], period: json['period'], current: json['current'], target: json['target'], completed: json['completed']);
}

class DailyState {
  DailyState({required this.entries, required this.completed, required this.total, required this.percentage, required this.gardenStage, required this.message});
  final List<DailyEntry> entries;
  final int completed, total, percentage, gardenStage;
  final String message;
  factory DailyState.fromJson(Map<String, dynamic> json) => DailyState(entries: (json['entries'] as List).map((e) => DailyEntry.fromJson(e)).toList(), completed: json['summary']['completed'], total: json['summary']['total'], percentage: json['summary']['percentage'], gardenStage: json['journey']['gardenStage'], message: json['journey']['message']);
}
