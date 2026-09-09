import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/daily_state.dart';
import '../../services/daily_api.dart';
import '../../widgets/ctj_widgets.dart';
import '../amalan/amalan_screen.dart';

class HomeShell extends StatefulWidget { const HomeShell({super.key}); @override State<HomeShell> createState() => _HomeShellState(); }
class _HomeShellState extends State<HomeShell> {
  final api = DailyApi(); DailyState? state; Object? error; int tab = 0;
  @override void initState(){ super.initState(); _load(); }
  Future<void> _load() async { try { final value=await api.load(); if(mounted)setState((){state=value;error=null;}); } catch(e){if(mounted)setState(()=>error=e);} }
  Future<void> _complete(String id) async { final value=await api.complete(id); if(mounted)setState(()=>state=value); }
  @override Widget build(BuildContext context) => Scaffold(body: _body(), bottomNavigationBar: NavigationBar(selectedIndex: tab, onDestinationSelected: (i)=>setState(()=>tab=i), backgroundColor: CtJColors.midnight, indicatorColor: CtJColors.gold.withOpacity(.25), destinations: const [NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label:'Home'), NavigationDestination(icon: Icon(Icons.check_circle_outline), label:'Amalan'), NavigationDestination(icon: Icon(Icons.people_outline), label:'Together'), NavigationDestination(icon: Icon(Icons.explore_outlined), label:'Journey'), NavigationDestination(icon: Icon(Icons.person_outline), label:'Profile')]));
  Widget _body(){ if(error!=null)return _Error(onRetry:_load); if(state==null)return const Center(child:CircularProgressIndicator()); if(tab==1)return AmalanScreen(state:state!, onComplete:_complete); if(tab==3)return _Journey(state:state!); if(tab>1)return const _ComingSoon(); return _Home(state:state!, onContinue:()=>setState(()=>tab=1)); }
}

class _Home extends StatelessWidget { const _Home({required this.state,required this.onContinue}); final DailyState state; final VoidCallback onContinue;
  @override Widget build(BuildContext context)=>CtJWorldScene(energy:state.percentage, child:SafeArea(child:ListView(padding:const EdgeInsets.all(20),children:[
    const Text("Assalamu'alaikum,",style:TextStyle(color:Colors.white70)), Text('Sampurno',style:Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize:28)), const Text('Terus melangkah, setiap kebaikan\nmembawa kita lebih dekat.'),
    const SizedBox(height:210), CtJCard(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('PERJALANAN HARI INI',style:TextStyle(letterSpacing:1.2,color:CtJColors.gold)),const SizedBox(height:8),CtJProgress(value:state.percentage),const SizedBox(height:10),Text('${state.completed} dari ${state.total} amalan')])) ,
    const SizedBox(height:18),Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[const Text('MY CIRCLES',style:TextStyle(fontWeight:FontWeight.bold)),TextButton(onPressed:(){},child:const Text('Lihat Semua'))]),
    const SizedBox(height:6),const SizedBox(height:110,child:ListView(scrollDirection:Axis.horizontal,children:[_Circle(name:'Keluarga Kami',members:4,progress:82),_Circle(name:'Sahabat Hijrah',members:6,progress:68),_Circle(name:'Kajian Al-Hikmah',members:24,progress:74)])),
    const SizedBox(height:18),FilledButton(onPressed:onContinue,style:FilledButton.styleFrom(backgroundColor:CtJColors.ivory,foregroundColor:CtJColors.ink,minimumSize:const Size.fromHeight(54)),child:const Text('Ayo lanjutkan perjalanan hari ini →'))
  ])));
}
class _Circle extends StatelessWidget{const _Circle({required this.name,required this.members,required this.progress});final String name;final int members,progress;@override Widget build(BuildContext context)=>Container(width:150,margin:const EdgeInsets.only(right:10),padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:CtJColors.ivory,borderRadius:BorderRadius.circular(20)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(name,style:const TextStyle(color:CtJColors.ink,fontWeight:FontWeight.bold)),Text('$members anggota',style:const TextStyle(color:CtJColors.ink,fontSize:12)),const Spacer(),Text('$progress%',style:const TextStyle(color:CtJColors.teal,fontWeight:FontWeight.bold))]));}
class _Journey extends StatelessWidget{const _Journey({required this.state});final DailyState state;@override Widget build(BuildContext context)=>CtJWorldScene(energy:state.percentage,child:SafeArea(child:Padding(padding:const EdgeInsets.all(24),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Journey',style:Theme.of(context).textTheme.headlineLarge),const Text('Setiap langkah baik menumbuhkan Taman Perjalanan.'),const Spacer(),CtJCard(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('TAHAP ${state.gardenStage} · TAMAN PERJALANAN',style:const TextStyle(color:CtJColors.gold)),const SizedBox(height:12),CtJProgress(value:state.percentage),const SizedBox(height:12),Text(state.message)]))]))));}
class _ComingSoon extends StatelessWidget{const _ComingSoon();@override Widget build(BuildContext context)=>const Center(child:Text('Fitur ini hadir pada fase berikutnya.'));}
class _Error extends StatelessWidget{const _Error({required this.onRetry});final VoidCallback onRetry;@override Widget build(BuildContext context)=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Icon(Icons.cloud_off,size:44),const SizedBox(height:12),const Text('Perjalanan belum dapat dimuat.\nPeriksa koneksi lalu coba kembali.',textAlign:TextAlign.center),const SizedBox(height:16),OutlinedButton(onPressed:onRetry,child:const Text('Coba lagi'))])));}
