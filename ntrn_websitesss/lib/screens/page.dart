import 'package:flutter/material.dart';

class Page extends StatelessWidget {
  const Page({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Page'),
      ),
      body: const Center(
        child: Text(
          'Page Screen',
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }
}
