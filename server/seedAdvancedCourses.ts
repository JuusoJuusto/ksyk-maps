import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

if (getApps().length === 0) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function seedAdvancedCourses() {
  console.log('🚀 Starting ADVANCED COURSES seed...\n');

  try {
    // ========== ADVANCED PYTHON COURSE ==========
    console.log('\n📚 Creating Advanced Python Course...');
    const advPythonId = 'python-advanced-2026';
    
    await db.collection('codingCourses').doc(advPythonId).set({
      id: advPythonId,
      title: {
        fi: '🐍 Python Pro - Edistynyt',
        en: '🐍 Python Pro - Advanced'
      },
      description: {
        fi: 'Vie Python-taitosi seuraavalle tasolle! OOP, algoritmit, data science ja paljon muuta.',
        en: 'Take your Python skills to the next level! OOP, algorithms, data science and more.'
      },
      difficulty: 'advanced',
      estimatedHours: 50,
      isFree: true,
      language: 'python',
      imageUrl: '/python-advanced.png',
      tags: ['python', 'advanced', 'oop', 'algorithms', 'data-science'],
      prerequisites: ['python-adventures-2026'],
      learningObjectives: {
        fi: ['🎯 Hallitse OOP', '🧮 Ymmärrä algoritmit', '📊 Analysoi dataa', '⚡ Optimoi koodia'],
        en: ['🎯 Master OOP', '🧮 Understand algorithms', '📊 Analyze data', '⚡ Optimize code']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const advPyMod1 = 'adv-py-mod-1';
    await db.collection('codingModules').doc(advPyMod1).set({
      id: advPyMod1,
      courseId: advPythonId,
      title: { fi: '🎯 Olio-ohjelmointi', en: '🎯 Object-Oriented Programming' },
      description: { fi: 'Luokat, objektit ja periytyminen', en: 'Classes, objects and inheritance' },
      orderIndex: 1,
      estimatedMinutes: 180,
      createdAt: new Date()
    });

    const advPyLesson1 = 'adv-py-lesson-1';
    await db.collection('codingLessons').doc(advPyLesson1).set({
      id: advPyLesson1,
      moduleId: advPyMod1,
      courseId: advPythonId,
      title: { fi: '🏗️ Luokat ja Objektit', en: '🏗️ Classes and Objects' },
      content: {
        fi: '# Luokat ja Objektit\n\nLuokat ovat koodin rakennuspalikoita!\n\n```python\nclass Auto:\n    def __init__(self, merkki, malli):\n        self.merkki = merkki\n        self.malli = malli\n    \n    def aja(self):\n        print(f"{self.merkki} {self.malli} ajaa!")\n\nminun_auto = Auto("Tesla", "Model 3")\nminun_auto.aja()\n```',
        en: '# Classes and Objects\n\nClasses are the building blocks of code!\n\n```python\nclass Car:\n    def __init__(self, brand, model):\n        self.brand = brand\n        self.model = model\n    \n    def drive(self):\n        print(f"{self.brand} {self.model} is driving!")\n\nmy_car = Car("Tesla", "Model 3")\nmy_car.drive()\n```'
      },
      orderIndex: 1,
      estimatedMinutes: 60,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('adv-py-ex-1').set({
      id: 'adv-py-ex-1',
      lessonId: advPyLesson1,
      moduleId: advPyMod1,
      courseId: advPythonId,
      title: { fi: '🏗️ Luo luokka', en: '🏗️ Create a Class' },
      description: { fi: 'Luo Henkilö-luokka', en: 'Create a Person class' },
      instructions: { fi: 'Luo luokka jolla on nimi ja ikä', en: 'Create class with name and age' },
      starterCode: '# Luo Henkilö-luokka\nclass Henkilo:\n    pass\n',
      solution: 'class Henkilo:\n    def __init__(self, nimi, ika):\n        self.nimi = nimi\n        self.ika = ika',
      difficulty: 'medium',
      xpReward: 100,
      orderIndex: 1,
      hints: { fi: ['💡 Käytä __init__'], en: ['💡 Use __init__'] },
      testCases: [{ input: '', expectedOutput: 'Henkilo', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ Advanced Python course created');

    // ========== TYPESCRIPT COURSE ==========
    console.log('\n📚 Creating TypeScript Course...');
    const tsId = 'typescript-mastery-2026';
    
    await db.collection('codingCourses').doc(tsId).set({
      id: tsId,
      title: {
        fi: '⚡ TypeScript Mestari',
        en: '⚡ TypeScript Mastery'
      },
      description: {
        fi: 'Opi TypeScript ja rakenna tyyppiturvallisia sovelluksia!',
        en: 'Learn TypeScript and build type-safe applications!'
      },
      difficulty: 'intermediate',
      estimatedHours: 45,
      isFree: true,
      language: 'typescript',
      imageUrl: '/ts-logo.png',
      tags: ['typescript', 'javascript', 'types', 'intermediate'],
      prerequisites: ['javascript-mastery-2026'],
      learningObjectives: {
        fi: ['📝 Ymmärrä tyypit', '🔒 Kirjoita turvallista koodia', '⚙️ Käytä interfaceja', '🎯 Hallitse generics'],
        en: ['📝 Understand types', '🔒 Write safe code', '⚙️ Use interfaces', '🎯 Master generics']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const tsMod1 = 'ts-mod-1';
    await db.collection('codingModules').doc(tsMod1).set({
      id: tsMod1,
      courseId: tsId,
      title: { fi: '📝 TypeScript Perusteet', en: '📝 TypeScript Basics' },
      description: { fi: 'Tyypit ja interfacet', en: 'Types and interfaces' },
      orderIndex: 1,
      estimatedMinutes: 150,
      createdAt: new Date()
    });

    const tsLesson1 = 'ts-lesson-1';
    await db.collection('codingLessons').doc(tsLesson1).set({
      id: tsLesson1,
      moduleId: tsMod1,
      courseId: tsId,
      title: { fi: '📝 Tyypit', en: '📝 Types' },
      content: {
        fi: '# TypeScript Tyypit\n\nTypeScript lisää tyypit JavaScriptiin!\n\n```typescript\nlet nimi: string = "Matti";\nlet ika: number = 25;\nlet onOpiskelija: boolean = true;\n\nfunction tervehdi(nimi: string): string {\n    return `Hei, ${nimi}!`;\n}\n```',
        en: '# TypeScript Types\n\nTypeScript adds types to JavaScript!\n\n```typescript\nlet name: string = "Matt";\nlet age: number = 25;\nlet isStudent: boolean = true;\n\nfunction greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n```'
      },
      orderIndex: 1,
      estimatedMinutes: 50,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('ts-ex-1').set({
      id: 'ts-ex-1',
      lessonId: tsLesson1,
      moduleId: tsMod1,
      courseId: tsId,
      title: { fi: '📝 Tyypitetty funktio', en: '📝 Typed Function' },
      description: { fi: 'Luo tyypitetty funktio', en: 'Create typed function' },
      instructions: { fi: 'Luo funktio joka ottaa numeron ja palauttaa numeron', en: 'Create function that takes number and returns number' },
      starterCode: '// Luo tyypitetty funktio\nfunction kaksinkertaista(luku) {\n    return luku * 2;\n}\n',
      solution: 'function kaksinkertaista(luku: number): number {\n    return luku * 2;\n}',
      difficulty: 'medium',
      xpReward: 100,
      orderIndex: 1,
      hints: { fi: ['💡 Käytä : number'], en: ['💡 Use : number'] },
      testCases: [{ input: '', expectedOutput: 'number', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ TypeScript course created');

    // ========== NODE.JS BACKEND COURSE ==========
    console.log('\n📚 Creating Node.js Backend Course...');
    const nodeId = 'nodejs-backend-2026';
    
    await db.collection('codingCourses').doc(nodeId).set({
      id: nodeId,
      title: {
        fi: '🔧 Node.js Backend',
        en: '🔧 Node.js Backend'
      },
      description: {
        fi: 'Rakenna tehokkaita backend-sovelluksia Node.js:llä ja Express:llä!',
        en: 'Build powerful backend applications with Node.js and Express!'
      },
      difficulty: 'intermediate',
      estimatedHours: 55,
      isFree: true,
      language: 'javascript',
      imageUrl: '/nodejs-logo.png',
      tags: ['nodejs', 'backend', 'express', 'api', 'intermediate'],
      prerequisites: ['javascript-mastery-2026'],
      learningObjectives: {
        fi: ['🌐 Luo REST API', '💾 Käytä tietokantoja', '🔐 Toteuta autentikointi', '⚡ Optimoi suorituskyky'],
        en: ['🌐 Create REST API', '💾 Use databases', '🔐 Implement auth', '⚡ Optimize performance']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const nodeMod1 = 'node-mod-1';
    await db.collection('codingModules').doc(nodeMod1).set({
      id: nodeMod1,
      courseId: nodeId,
      title: { fi: '🌐 Express.js', en: '🌐 Express.js' },
      description: { fi: 'Web-palvelin Express:llä', en: 'Web server with Express' },
      orderIndex: 1,
      estimatedMinutes: 180,
      createdAt: new Date()
    });

    const nodeLesson1 = 'node-lesson-1';
    await db.collection('codingLessons').doc(nodeLesson1).set({
      id: nodeLesson1,
      moduleId: nodeMod1,
      courseId: nodeId,
      title: { fi: '🌐 Ensimmäinen API', en: '🌐 First API' },
      content: {
        fi: '# Express.js API\n\nLuo ensimmäinen REST API!\n\n```javascript\nconst express = require("express");\nconst app = express();\n\napp.get("/api/hello", (req, res) => {\n    res.json({ message: "Hei maailma!" });\n});\n\napp.listen(3000, () => {\n    console.log("Palvelin käynnissä portissa 3000");\n});\n```',
        en: '# Express.js API\n\nCreate your first REST API!\n\n```javascript\nconst express = require("express");\nconst app = express();\n\napp.get("/api/hello", (req, res) => {\n    res.json({ message: "Hello world!" });\n});\n\napp.listen(3000, () => {\n    console.log("Server running on port 3000");\n});\n```'
      },
      orderIndex: 1,
      estimatedMinutes: 60,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('node-ex-1').set({
      id: 'node-ex-1',
      lessonId: nodeLesson1,
      moduleId: nodeMod1,
      courseId: nodeId,
      title: { fi: '🌐 Luo endpoint', en: '🌐 Create Endpoint' },
      description: { fi: 'Luo GET endpoint', en: 'Create GET endpoint' },
      instructions: { fi: 'Luo /api/users endpoint', en: 'Create /api/users endpoint' },
      starterCode: 'const express = require("express");\nconst app = express();\n\n// Luo endpoint tähän\n',
      solution: 'app.get("/api/users", (req, res) => {\n    res.json({ users: [] });\n});',
      difficulty: 'medium',
      xpReward: 100,
      orderIndex: 1,
      hints: { fi: ['💡 Käytä app.get()'], en: ['💡 Use app.get()'] },
      testCases: [{ input: '', expectedOutput: '/api/users', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ Node.js Backend course created');

    // ========== DATA STRUCTURES & ALGORITHMS ==========
    console.log('\n📚 Creating Data Structures & Algorithms Course...');
    const dsaId = 'dsa-mastery-2026';
    
    await db.collection('codingCourses').doc(dsaId).set({
      id: dsaId,
      title: {
        fi: '🧮 Algoritmit & Tietorakenteet',
        en: '🧮 Algorithms & Data Structures'
      },
      description: {
        fi: 'Hallitse algoritmit ja tietorakenteet! Valmistaudu teknisiin haastatteluihin.',
        en: 'Master algorithms and data structures! Prepare for technical interviews.'
      },
      difficulty: 'advanced',
      estimatedHours: 70,
      isFree: true,
      language: 'python',
      imageUrl: '/dsa-logo.png',
      tags: ['algorithms', 'data-structures', 'advanced', 'interview-prep'],
      prerequisites: ['python-adventures-2026', 'python-advanced-2026'],
      learningObjectives: {
        fi: ['🎯 Ymmärrä Big O', '📊 Hallitse tietorakenteet', '🧩 Ratkaise algoritmeja', '💼 Läpäise haastattelut'],
        en: ['🎯 Understand Big O', '📊 Master data structures', '🧩 Solve algorithms', '💼 Pass interviews']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const dsaMod1 = 'dsa-mod-1';
    await db.collection('codingModules').doc(dsaMod1).set({
      id: dsaMod1,
      courseId: dsaId,
      title: { fi: '📊 Tietorakenteet', en: '📊 Data Structures' },
      description: { fi: 'Listat, pinot, jonot ja puut', en: 'Lists, stacks, queues and trees' },
      orderIndex: 1,
      estimatedMinutes: 240,
      createdAt: new Date()
    });

    const dsaLesson1 = 'dsa-lesson-1';
    await db.collection('codingLessons').doc(dsaLesson1).set({
      id: dsaLesson1,
      moduleId: dsaMod1,
      courseId: dsaId,
      title: { fi: '📚 Linkitetty lista', en: '📚 Linked List' },
      content: {
        fi: '# Linkitetty Lista\n\nTehokas tietorakenne!\n\n```python\nclass Solmu:\n    def __init__(self, arvo):\n        self.arvo = arvo\n        self.seuraava = None\n\nclass LinkitettyLista:\n    def __init__(self):\n        self.paa = None\n    \n    def lisaa(self, arvo):\n        uusi = Solmu(arvo)\n        uusi.seuraava = self.paa\n        self.paa = uusi\n```',
        en: '# Linked List\n\nEfficient data structure!\n\n```python\nclass Node:\n    def __init__(self, value):\n        self.value = value\n        self.next = None\n\nclass LinkedList:\n    def __init__(self):\n        self.head = None\n    \n    def add(self, value):\n        new_node = Node(value)\n        new_node.next = self.head\n        self.head = new_node\n```'
      },
      orderIndex: 1,
      estimatedMinutes: 80,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('dsa-ex-1').set({
      id: 'dsa-ex-1',
      lessonId: dsaLesson1,
      moduleId: dsaMod1,
      courseId: dsaId,
      title: { fi: '📚 Toteuta linkitetty lista', en: '📚 Implement Linked List' },
      description: { fi: 'Luo linkitetty lista', en: 'Create linked list' },
      instructions: { fi: 'Toteuta Solmu-luokka', en: 'Implement Node class' },
      starterCode: '# Toteuta Solmu-luokka\nclass Solmu:\n    pass\n',
      solution: 'class Solmu:\n    def __init__(self, arvo):\n        self.arvo = arvo\n        self.seuraava = None',
      difficulty: 'hard',
      xpReward: 150,
      orderIndex: 1,
      hints: { fi: ['💡 Tallenna arvo ja seuraava'], en: ['💡 Store value and next'] },
      testCases: [{ input: '', expectedOutput: 'Solmu', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ Data Structures & Algorithms course created');

    console.log('\n✅ ADVANCED COURSES seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 4 New Advanced Courses');
    console.log('  - Python Advanced (50h)');
    console.log('  - TypeScript (45h)');
    console.log('  - Node.js Backend (55h)');
    console.log('  - Data Structures & Algorithms (70h)');
    console.log('  - Total: 220 hours, 4 exercises, 450 XP');
    console.log('\n🎉 Total platform content: 385 hours!');

  } catch (error) {
    console.error('\n❌ Error seeding:', error);
    throw error;
  }
}

seedAdvancedCourses()
  .then(() => {
    console.log('\n✅ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
