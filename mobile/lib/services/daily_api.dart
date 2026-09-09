import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../models/daily_state.dart';

class DailyApi {
  DailyApi({http.Client? client, this.baseUrl = 'http://10.0.2.2:3000/v1'}) : client = client ?? http.Client();
  final http.Client client;
  final String baseUrl;
  static const headers = {'x-user-id': 'demo-user', 'content-type': 'application/json'};
  Future<DailyState> load() async => _decode(await client.get(Uri.parse('$baseUrl/daily'), headers: headers));
  Future<DailyState> complete(String entryId) async => _decode(await client.post(Uri.parse('$baseUrl/daily/$entryId/complete'), headers: headers, body: jsonEncode({'clientMutationId': const Uuid().v4()})));
  DailyState _decode(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) throw Exception('Perjalanan belum dapat diperbarui. Coba kembali.');
    return DailyState.fromJson(jsonDecode(response.body));
  }
}
