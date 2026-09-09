import 'package:flutter_test/flutter_test.dart';
import 'package:connected_to_jannah/models/daily_state.dart';

void main(){test('parses authoritative progress and Journey stage',(){final state=DailyState.fromJson({'entries':[],'summary':{'completed':8,'total':11,'percentage':73},'journey':{'gardenStage':2,'message':'Journey World menerima cahaya baru.'}});expect(state.percentage,73);expect(state.gardenStage,2);});}
