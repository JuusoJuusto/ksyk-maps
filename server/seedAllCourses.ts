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

async function seedAllCourses() {
  console.log('🚀 Starting ALL COURSES seed...\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing old data...');
    const collections = ['codingCourses', 'codingModules', 'codingLessons', 'codingExercises'];
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`  ✓ Cleared ${snapshot.docs.length} documents from ${collectionName}`);
      }
    }

    // ========== PYTHON COURSE ==========
    console.log('\n📚 Creating Python Course...');
    const pythonCourseId = 'python-adventures-2026';
    
    await db.collection('codingCourses').doc(pythonCourseId).set({
      id: pythonCourseId,
      title: {
        fi: '🐍 Python Seikkailut',
        en: '🐍 Python Adventures'
      },
      description: {
        fi: 'Opi Python-ohjelmointi hauskalla tavalla! Täydellinen aloittelijoille.',
        en: 'Learn Python programming the fun way! Perfect for beginners.'
      },
      difficulty: 'beginner',
      estimatedHours: 40,
      isFree: true,
      language: 'python',
      imageUrl: '/python-logo.png',
      tags: ['python', 'programming', 'basics', 'beginner'],
      prerequisites: [],
      learningObjectives: {
        fi: ['🎮 Luo omia ohjelmia', '🧩 Ratkaise ongelmia', '🤖 Ymmärrä ohjelmointi', '⚡ Kirjoita tehokasta koodia'],
        en: ['🎮 Create your own programs', '🧩 Solve problems', '🤖 Understand programming', '⚡ Write efficient code']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Python Module 1
    const pythonMod1 = 'python-mod-1';
    await db.collection('codingModules').doc(pythonMod1).set({
      id: pythonMod1,
      courseId: pythonCourseId,
      title: { fi: '🌟 Aloitus', en: '🌟 Getting Started' },
      description: { fi: 'Opi perusteet', en: 'Learn the basics' },
      orderIndex: 1,
      estimatedMinutes: 120,
      createdAt: new Date()
    });

    const pythonLesson1 = 'python-lesson-1';
    await db.collection('codingLessons').doc(pythonLesson1).set({
      id: pythonLesson1,
      moduleId: pythonMod1,
      courseId: pythonCourseId,
      title: { fi: '✨ Print-komento', en: '✨ Print Command' },
      content: {
        fi: '# Print-komento\n\n`print()` tulostaa tekstiä näytölle!\n\n```python\nprint("Hei Python!")\n```',
        en: '# Print Command\n\n`print()` displays text on screen!\n\n```python\nprint("Hello Python!")\n```'
      },
      orderIndex: 1,
      estimatedMinutes: 30,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('python-ex-1').set({
      id: 'python-ex-1',
      lessonId: pythonLesson1,
      moduleId: pythonMod1,
      courseId: pythonCourseId,
      title: { fi: '🎩 Ensimmäinen ohjelma', en: '🎩 First Program' },
      description: { fi: 'Tulosta "Hei Python!"', en: 'Print "Hello Python!"' },
      instructions: { fi: 'Käytä print() tulostamaan teksti', en: 'Use print() to display text' },
      starterCode: '# Kirjoita koodisi tähän\n',
      solution: 'print("Hei Python!")',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 1,
      hints: { fi: ['💡 Käytä print()'], en: ['💡 Use print()'] },
      testCases: [{ input: '', expectedOutput: 'Hei Python!', hidden: false }],
      createdAt: new Date()
    });

    console.log('  ✓ Python course created');

    // ========== JAVASCRIPT COURSE ==========
    console.log('\n📚 Creating JavaScript Course...');
    const jsCourseId = 'javascript-mastery-2026';
    
    await db.collection('codingCourses').doc(jsCourseId).set({
      id: jsCourseId,
      title: {
        fi: '⚡ JavaScript Mestari',
        en: '⚡ JavaScript Mastery'
      },
      description: {
        fi: 'Hallitse web-ohjelmointi! Luo interaktiivisia nettisivuja ja sovelluksia.',
        en: 'Master web programming! Create interactive websites and applications.'
      },
      difficulty: 'beginner',
      estimatedHours: 35,
      isFree: true,
      language: 'javascript',
      imageUrl: '/js-logo.png',
      tags: ['javascript', 'web', 'frontend', 'beginner'],
      prerequisites: [],
      learningObjectives: {
        fi: ['🌐 Luo nettisivuja', '🎨 Tee interaktiivisia elementtejä', '🚀 Rakenna web-sovelluksia', '💡 Ymmärrä DOM'],
        en: ['🌐 Create websites', '🎨 Make interactive elements', '🚀 Build web apps', '💡 Understand DOM']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // JavaScript Module 1
    const jsMod1 = 'js-mod-1';
    await db.collection('codingModules').doc(jsMod1).set({
      id: jsMod1,
      courseId: jsCourseId,
      title: { fi: '🌟 JavaScript Perusteet', en: '🌟 JavaScript Basics' },
      description: { fi: 'Opi JavaScriptin perusteet', en: 'Learn JavaScript fundamentals' },
      orderIndex: 1,
      estimatedMinutes: 150,
      createdAt: new Date()
    });

    const jsLesson1 = 'js-lesson-1';
    await db.collection('codingLessons').doc(jsLesson1).set({
      id: jsLesson1,
      moduleId: jsMod1,
      courseId: jsCourseId,
      title: { fi: '⚡ Console.log', en: '⚡ Console.log' },
      content: {
        fi: '# Console.log\n\n`console.log()` tulostaa viestejä konsoliin!\n\n```javascript\nconsole.log("Hei JavaScript!");\n```\n\n## Muuttujat\n\n```javascript\nlet nimi = "Matti";\nconsole.log(nimi);\n```',
        en: '# Console.log\n\n`console.log()` prints messages to console!\n\n```javascript\nconsole.log("Hello JavaScript!");\n```\n\n## Variables\n\n```javascript\nlet name = "Matt";\nconsole.log(name);\n```'
      },
      orderIndex: 1,
      estimatedMinutes: 40,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('js-ex-1').set({
      id: 'js-ex-1',
      lessonId: jsLesson1,
      moduleId: jsMod1,
      courseId: jsCourseId,
      title: { fi: '⚡ Ensimmäinen JS-ohjelma', en: '⚡ First JS Program' },
      description: { fi: 'Tulosta "Hei JavaScript!"', en: 'Print "Hello JavaScript!"' },
      instructions: { fi: 'Käytä console.log()', en: 'Use console.log()' },
      starterCode: '// Kirjoita koodisi tähän\n',
      solution: 'console.log("Hei JavaScript!");',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 1,
      hints: { fi: ['💡 Käytä console.log()'], en: ['💡 Use console.log()'] },
      testCases: [{ input: '', expectedOutput: 'Hei JavaScript!', hidden: false }],
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('js-ex-2').set({
      id: 'js-ex-2',
      lessonId: jsLesson1,
      moduleId: jsMod1,
      courseId: jsCourseId,
      title: { fi: '📦 Muuttujat', en: '📦 Variables' },
      description: { fi: 'Luo muuttuja ja tulosta se', en: 'Create a variable and print it' },
      instructions: { fi: 'Luo muuttuja "nimi" ja tulosta se', en: 'Create variable "name" and print it' },
      starterCode: '// Luo muuttuja\nlet nimi = "";\n',
      solution: 'let nimi = "Matti";\nconsole.log(nimi);',
      difficulty: 'easy',
      xpReward: 75,
      orderIndex: 2,
      hints: { fi: ['💡 let nimi = "..."', '💡 console.log(nimi)'], en: ['💡 let name = "..."', '💡 console.log(name)'] },
      testCases: [{ input: '', expectedOutput: 'nimi', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ JavaScript course created');

    // ========== HTML/CSS COURSE ==========
    console.log('\n📚 Creating HTML/CSS Course...');
    const htmlCourseId = 'html-css-basics-2026';
    
    await db.collection('codingCourses').doc(htmlCourseId).set({
      id: htmlCourseId,
      title: {
        fi: '🎨 HTML & CSS Perusteet',
        en: '🎨 HTML & CSS Basics'
      },
      description: {
        fi: 'Luo kauniita nettisivuja! Opi HTML ja CSS alusta alkaen.',
        en: 'Create beautiful websites! Learn HTML and CSS from scratch.'
      },
      difficulty: 'beginner',
      estimatedHours: 30,
      isFree: true,
      language: 'html',
      imageUrl: '/html-logo.png',
      tags: ['html', 'css', 'web', 'design', 'beginner'],
      prerequisites: [],
      learningObjectives: {
        fi: ['🏗️ Rakenna nettisivuja', '🎨 Tyylitä elementtejä', '📱 Tee responsiivisia sivuja', '✨ Luo kauniita ulkoasuja'],
        en: ['🏗️ Build websites', '🎨 Style elements', '📱 Make responsive pages', '✨ Create beautiful designs']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // HTML Module 1
    const htmlMod1 = 'html-mod-1';
    await db.collection('codingModules').doc(htmlMod1).set({
      id: htmlMod1,
      courseId: htmlCourseId,
      title: { fi: '🏗️ HTML Perusteet', en: '🏗️ HTML Basics' },
      description: { fi: 'Opi HTML-rakenne', en: 'Learn HTML structure' },
      orderIndex: 1,
      estimatedMinutes: 120,
      createdAt: new Date()
    });

    const htmlLesson1 = 'html-lesson-1';
    await db.collection('codingLessons').doc(htmlLesson1).set({
      id: htmlLesson1,
      moduleId: htmlMod1,
      courseId: htmlCourseId,
      title: { fi: '🏗️ Ensimmäinen HTML-sivu', en: '🏗️ First HTML Page' },
      content: {
        fi: '# HTML Perusteet\n\nHTML on nettisivujen rakennuskieli!\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Minun sivuni</title>\n</head>\n<body>\n  <h1>Tervetuloa!</h1>\n  <p>Tämä on ensimmäinen sivuni.</p>\n</body>\n</html>\n```\n\n## Tärkeät tagit\n\n- `<h1>` - Otsikko\n- `<p>` - Kappale\n- `<a>` - Linkki\n- `<img>` - Kuva',
        en: '# HTML Basics\n\nHTML is the building language of websites!\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Welcome!</h1>\n  <p>This is my first page.</p>\n</body>\n</html>\n```\n\n## Important Tags\n\n- `<h1>` - Heading\n- `<p>` - Paragraph\n- `<a>` - Link\n- `<img>` - Image'
      },
      orderIndex: 1,
      estimatedMinutes: 45,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('html-ex-1').set({
      id: 'html-ex-1',
      lessonId: htmlLesson1,
      moduleId: htmlMod1,
      courseId: htmlCourseId,
      title: { fi: '🏗️ Luo otsikko', en: '🏗️ Create Heading' },
      description: { fi: 'Luo h1-otsikko', en: 'Create h1 heading' },
      instructions: { fi: 'Käytä <h1> tagia luodaksesi otsikon "Tervetuloa!"', en: 'Use <h1> tag to create heading "Welcome!"' },
      starterCode: '<!-- Kirjoita HTML-koodisi tähän -->\n',
      solution: '<h1>Tervetuloa!</h1>',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 1,
      hints: { fi: ['💡 Käytä <h1> ja </h1>'], en: ['💡 Use <h1> and </h1>'] },
      testCases: [{ input: '', expectedOutput: '<h1>Tervetuloa!</h1>', hidden: false }],
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('html-ex-2').set({
      id: 'html-ex-2',
      lessonId: htmlLesson1,
      moduleId: htmlMod1,
      courseId: htmlCourseId,
      title: { fi: '📝 Luo kappale', en: '📝 Create Paragraph' },
      description: { fi: 'Luo p-kappale', en: 'Create p paragraph' },
      instructions: { fi: 'Käytä <p> tagia luodaksesi kappaleen', en: 'Use <p> tag to create paragraph' },
      starterCode: '<!-- Luo kappale -->\n',
      solution: '<p>Tämä on kappale.</p>',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 2,
      hints: { fi: ['💡 Käytä <p> ja </p>'], en: ['💡 Use <p> and </p>'] },
      testCases: [{ input: '', expectedOutput: '<p>', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ HTML/CSS course created');

    // ========== WEB DEVELOPMENT COURSE ==========
    console.log('\n📚 Creating Web Development Course...');
    const webCourseId = 'web-dev-fullstack-2026';
    
    await db.collection('codingCourses').doc(webCourseId).set({
      id: webCourseId,
      title: {
        fi: '🚀 Web-kehitys Pro',
        en: '🚀 Web Development Pro'
      },
      description: {
        fi: 'Tule full-stack kehittäjäksi! Luo kokonaisia web-sovelluksia.',
        en: 'Become a full-stack developer! Create complete web applications.'
      },
      difficulty: 'intermediate',
      estimatedHours: 60,
      isFree: true,
      language: 'javascript',
      imageUrl: '/web-dev-logo.png',
      tags: ['web', 'fullstack', 'react', 'nodejs', 'intermediate'],
      prerequisites: ['javascript-mastery-2026', 'html-css-basics-2026'],
      learningObjectives: {
        fi: ['🎯 Rakenna full-stack sovelluksia', '⚛️ Opi React', '🔧 Käytä Node.js', '💾 Hallitse tietokantoja'],
        en: ['🎯 Build full-stack apps', '⚛️ Learn React', '🔧 Use Node.js', '💾 Master databases']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const webMod1 = 'web-mod-1';
    await db.collection('codingModules').doc(webMod1).set({
      id: webMod1,
      courseId: webCourseId,
      title: { fi: '⚛️ React Perusteet', en: '⚛️ React Basics' },
      description: { fi: 'Opi React-kirjasto', en: 'Learn React library' },
      orderIndex: 1,
      estimatedMinutes: 200,
      createdAt: new Date()
    });

    const webLesson1 = 'web-lesson-1';
    await db.collection('codingLessons').doc(webLesson1).set({
      id: webLesson1,
      moduleId: webMod1,
      courseId: webCourseId,
      title: { fi: '⚛️ Ensimmäinen React-komponentti', en: '⚛️ First React Component' },
      content: {
        fi: '# React Komponentit\n\nReact käyttää komponentteja rakentaakseen käyttöliittymiä!\n\n```jsx\nfunction Welcome() {\n  return <h1>Tervetuloa Reactiin!</h1>;\n}\n```\n\n## JSX\n\nJSX on HTML:n kaltaista syntaksia JavaScriptissä!',
        en: '# React Components\n\nReact uses components to build user interfaces!\n\n```jsx\nfunction Welcome() {\n  return <h1>Welcome to React!</h1>;\n}\n```\n\n## JSX\n\nJSX is HTML-like syntax in JavaScript!'
      },
      orderIndex: 1,
      estimatedMinutes: 60,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('web-ex-1').set({
      id: 'web-ex-1',
      lessonId: webLesson1,
      moduleId: webMod1,
      courseId: webCourseId,
      title: { fi: '⚛️ Luo komponentti', en: '⚛️ Create Component' },
      description: { fi: 'Luo yksinkertainen React-komponentti', en: 'Create simple React component' },
      instructions: { fi: 'Luo funktio joka palauttaa JSX:n', en: 'Create function that returns JSX' },
      starterCode: '// Luo komponentti\nfunction MyComponent() {\n  return (\n    // Kirjoita JSX tähän\n  );\n}\n',
      solution: 'function MyComponent() {\n  return <h1>Hello React!</h1>;\n}',
      difficulty: 'medium',
      xpReward: 100,
      orderIndex: 1,
      hints: { fi: ['💡 Palauta JSX'], en: ['💡 Return JSX'] },
      testCases: [{ input: '', expectedOutput: 'MyComponent', hidden: false, partialMatch: true }],
      createdAt: new Date()
    });

    console.log('  ✓ Web Development course created');

    console.log('\n✅ ALL COURSES seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 4 Courses: Python, JavaScript, HTML/CSS, Web Development');
    console.log('  - 4 Modules total');
    console.log('  - 4 Lessons with rich content');
    console.log('  - 8 Exercises: 550 XP total');
    console.log('\n🎉 Students can now learn multiple programming languages!');

  } catch (error) {
    console.error('\n❌ Error seeding:', error);
    throw error;
  }
}

seedAllCourses()
  .then(() => {
    console.log('\n✅ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
