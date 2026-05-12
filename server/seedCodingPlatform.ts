import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function seedCodingPlatform() {
  console.log('🚀 Starting to seed coding platform...');

  try {
    // Python Basics Course
    const pythonBasicsCourse = {
      id: 'python-basics-2026',
      title: {
        fi: 'Python perusteet',
        en: 'Python Basics'
      },
      description: {
        fi: 'Opi Python-ohjelmoinnin perusteet alusta alkaen. Tämä kurssi on täydellinen aloittelijoille.',
        en: 'Learn Python programming from scratch. This course is perfect for beginners.'
      },
      difficulty: 'beginner',
      estimatedHours: 20,
      isFree: true,
      language: 'python',
      imageUrl: '/python-logo.png',
      tags: ['python', 'programming', 'basics', 'beginner'],
      prerequisites: [],
      learningObjectives: {
        fi: [
          'Ymmärrät Python-syntaksin perusteet',
          'Osaat käyttää muuttujia ja tietotyyppejä',
          'Hallitset ehtolauseet ja silmukat',
          'Osaat luoda ja käyttää funktioita',
          'Ymmärrät listat ja sanakirjat'
        ],
        en: [
          'Understand Python syntax basics',
          'Use variables and data types',
          'Master conditional statements and loops',
          'Create and use functions',
          'Understand lists and dictionaries'
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📚 Creating Python Basics course...');
    await db.collection('codingCourses').doc(pythonBasicsCourse.id).set(pythonBasicsCourse);

    // Module 1: Getting Started
    const module1 = {
      id: 'module-1-getting-started',
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Aloittaminen',
        en: 'Getting Started'
      },
      description: {
        fi: 'Opi Python-ohjelmoinnin perusteet ja kirjoita ensimmäinen ohjelmasi',
        en: 'Learn Python basics and write your first program'
      },
      orderIndex: 1,
      estimatedMinutes: 60,
      createdAt: new Date()
    };

    console.log('📖 Creating Module 1...');
    await db.collection('codingModules').doc(module1.id).set(module1);

    // Lesson 1.1: Hello World
    const lesson1_1 = {
      id: 'lesson-1-1-hello-world',
      moduleId: module1.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Hei maailma!',
        en: 'Hello World!'
      },
      content: {
        fi: `# Tervetuloa Python-ohjelmointiin!

Python on yksi maailman suosituimmista ohjelmointikielistä. Se on helppo oppia ja sitä käytetään monilla aloilla.

## Ensimmäinen ohjelma

Aloitetaan klassisella "Hei maailma!" -ohjelmalla:

\`\`\`python
print("Hei maailma!")
\`\`\`

\`print()\` -funktio tulostaa tekstin näytölle. Teksti laitetaan lainausmerkkien sisään.

## Kokeile itse!

Kirjoita oma viestisi print-funktiolla. Voit tulostaa mitä tahansa tekstiä!`,
        en: `# Welcome to Python Programming!

Python is one of the world's most popular programming languages. It's easy to learn and used in many fields.

## Your First Program

Let's start with the classic "Hello World!" program:

\`\`\`python
print("Hello World!")
\`\`\`

The \`print()\` function displays text on the screen. Text goes inside quotation marks.

## Try it yourself!

Write your own message using the print function. You can print any text you want!`
      },
      orderIndex: 1,
      estimatedMinutes: 15,
      videoUrl: null,
      createdAt: new Date()
    };

    console.log('📝 Creating Lesson 1.1...');
    await db.collection('codingLessons').doc(lesson1_1.id).set(lesson1_1);

    // Exercise 1.1.1: Print Hello
    const exercise1_1_1 = {
      id: 'exercise-1-1-1-print-hello',
      lessonId: lesson1_1.id,
      moduleId: module1.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Tulosta tervehdys',
        en: 'Print a Greeting'
      },
      description: {
        fi: 'Käytä print-funktiota tulostaaksesi "Hei maailma!" näytölle.',
        en: 'Use the print function to display "Hello World!" on the screen.'
      },
      instructions: {
        fi: 'Kirjoita ohjelma, joka tulostaa tekstin "Hei maailma!" käyttäen print-funktiota.',
        en: 'Write a program that prints the text "Hello World!" using the print function.'
      },
      starterCode: '# Kirjoita koodisi tähän\n',
      solution: 'print("Hei maailma!")',
      difficulty: 'easy',
      xpReward: 10,
      orderIndex: 1,
      hints: {
        fi: [
          'Käytä print() -funktiota',
          'Laita teksti lainausmerkkien sisään',
          'Muista sulkea sulut!'
        ],
        en: [
          'Use the print() function',
          'Put text inside quotation marks',
          'Remember to close the parentheses!'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Hei maailma!',
          hidden: false
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 1.1.1...');
    await db.collection('codingExercises').doc(exercise1_1_1.id).set(exercise1_1_1);

    // Exercise 1.1.2: Print Your Name
    const exercise1_1_2 = {
      id: 'exercise-1-1-2-print-name',
      lessonId: lesson1_1.id,
      moduleId: module1.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Tulosta nimesi',
        en: 'Print Your Name'
      },
      description: {
        fi: 'Tulosta oma nimesi näytölle.',
        en: 'Print your own name on the screen.'
      },
      instructions: {
        fi: 'Kirjoita ohjelma, joka tulostaa tekstin "Minun nimeni on [nimesi]".',
        en: 'Write a program that prints "My name is [your name]".'
      },
      starterCode: '# Tulosta nimesi\n',
      solution: 'print("Minun nimeni on Matti")',
      difficulty: 'easy',
      xpReward: 10,
      orderIndex: 2,
      hints: {
        fi: [
          'Käytä print-funktiota',
          'Korvaa [nimesi] omalla nimelläsi'
        ],
        en: [
          'Use the print function',
          'Replace [your name] with your actual name'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Minun nimeni on',
          hidden: false,
          partialMatch: true
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 1.1.2...');
    await db.collection('codingExercises').doc(exercise1_1_2.id).set(exercise1_1_2);

    // Lesson 1.2: Variables
    const lesson1_2 = {
      id: 'lesson-1-2-variables',
      moduleId: module1.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Muuttujat',
        en: 'Variables'
      },
      content: {
        fi: `# Muuttujat Pythonissa

Muuttuja on kuin laatikko, johon voit tallentaa tietoa. Voit antaa muuttujalle nimen ja arvon.

## Muuttujan luominen

\`\`\`python
nimi = "Matti"
ikä = 15
pituus = 1.65
\`\`\`

## Muuttujien käyttö

\`\`\`python
nimi = "Matti"
print("Hei,", nimi)
# Tulostaa: Hei, Matti
\`\`\`

## Muuttujien yhdistäminen

\`\`\`python
etunimi = "Matti"
sukunimi = "Meikäläinen"
koko_nimi = etunimi + " " + sukunimi
print(koko_nimi)
# Tulostaa: Matti Meikäläinen
\`\`\``,
        en: `# Variables in Python

A variable is like a box where you can store information. You can give a variable a name and a value.

## Creating a Variable

\`\`\`python
name = "John"
age = 15
height = 1.65
\`\`\`

## Using Variables

\`\`\`python
name = "John"
print("Hello,", name)
# Prints: Hello, John
\`\`\`

## Combining Variables

\`\`\`python
first_name = "John"
last_name = "Doe"
full_name = first_name + " " + last_name
print(full_name)
# Prints: John Doe
\`\`\``
      },
      orderIndex: 2,
      estimatedMinutes: 20,
      videoUrl: null,
      createdAt: new Date()
    };

    console.log('📝 Creating Lesson 1.2...');
    await db.collection('codingLessons').doc(lesson1_2.id).set(lesson1_2);

    // Exercise 1.2.1: Create Variables
    const exercise1_2_1 = {
      id: 'exercise-1-2-1-create-variables',
      lessonId: lesson1_2.id,
      moduleId: module1.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Luo muuttujia',
        en: 'Create Variables'
      },
      description: {
        fi: 'Luo muuttujia ja tulosta niiden arvot.',
        en: 'Create variables and print their values.'
      },
      instructions: {
        fi: 'Luo muuttuja nimeltä "nimi" arvolla "Matti" ja tulosta se.',
        en: 'Create a variable called "name" with value "John" and print it.'
      },
      starterCode: '# Luo muuttuja ja tulosta se\n',
      solution: 'nimi = "Matti"\nprint(nimi)',
      difficulty: 'easy',
      xpReward: 15,
      orderIndex: 1,
      hints: {
        fi: [
          'Käytä = -merkkiä asettaaksesi arvon',
          'Laita teksti lainausmerkkien sisään',
          'Tulosta muuttuja ilman lainausmerkkejä'
        ],
        en: [
          'Use = to assign a value',
          'Put text inside quotation marks',
          'Print the variable without quotes'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Matti',
          hidden: false
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 1.2.1...');
    await db.collection('codingExercises').doc(exercise1_2_1.id).set(exercise1_2_1);

    // Module 2: Control Flow
    const module2 = {
      id: 'module-2-control-flow',
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Ohjausrakenteet',
        en: 'Control Flow'
      },
      description: {
        fi: 'Opi käyttämään ehtolauseita ja silmukoita',
        en: 'Learn to use conditional statements and loops'
      },
      orderIndex: 2,
      estimatedMinutes: 90,
      createdAt: new Date()
    };

    console.log('📖 Creating Module 2...');
    await db.collection('codingModules').doc(module2.id).set(module2);

    // Lesson 2.1: If Statements
    const lesson2_1 = {
      id: 'lesson-2-1-if-statements',
      moduleId: module2.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Ehtolauseet',
        en: 'If Statements'
      },
      content: {
        fi: `# Ehtolauseet

Ehtolauseet antavat ohjelman tehdä päätöksiä. Koodi suoritetaan vain, jos ehto on tosi.

## If-lause

\`\`\`python
ikä = 16
if ikä >= 15:
    print("Olet tarpeeksi vanha!")
\`\`\`

## If-else

\`\`\`python
ikä = 12
if ikä >= 15:
    print("Olet tarpeeksi vanha!")
else:
    print("Olet liian nuori.")
\`\`\`

## If-elif-else

\`\`\`python
arvosana = 85
if arvosana >= 90:
    print("Erinomainen!")
elif arvosana >= 75:
    print("Hyvä!")
else:
    print("Harjoittele lisää.")
\`\`\`

**Huom!** Pythonissa sisennys on tärkeä. Käytä 4 välilyöntiä.`,
        en: `# If Statements

If statements let your program make decisions. Code runs only if the condition is true.

## If Statement

\`\`\`python
age = 16
if age >= 15:
    print("You're old enough!")
\`\`\`

## If-else

\`\`\`python
age = 12
if age >= 15:
    print("You're old enough!")
else:
    print("You're too young.")
\`\`\`

## If-elif-else

\`\`\`python
grade = 85
if grade >= 90:
    print("Excellent!")
elif grade >= 75:
    print("Good!")
else:
    print("Keep practicing.")
\`\`\`

**Note!** Indentation is important in Python. Use 4 spaces.`
      },
      orderIndex: 1,
      estimatedMinutes: 25,
      videoUrl: null,
      createdAt: new Date()
    };

    console.log('📝 Creating Lesson 2.1...');
    await db.collection('codingLessons').doc(lesson2_1.id).set(lesson2_1);

    // Exercise 2.1.1: Age Check
    const exercise2_1_1 = {
      id: 'exercise-2-1-1-age-check',
      lessonId: lesson2_1.id,
      moduleId: module2.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Ikätarkistus',
        en: 'Age Check'
      },
      description: {
        fi: 'Tarkista onko henkilö tarpeeksi vanha.',
        en: 'Check if a person is old enough.'
      },
      instructions: {
        fi: 'Luo muuttuja "ikä" arvolla 16. Jos ikä on 15 tai enemmän, tulosta "Tervetuloa!". Muuten tulosta "Liian nuori."',
        en: 'Create a variable "age" with value 16. If age is 15 or more, print "Welcome!". Otherwise print "Too young."'
      },
      starterCode: '# Tarkista ikä\nikä = 16\n',
      solution: 'ikä = 16\nif ikä >= 15:\n    print("Tervetuloa!")\nelse:\n    print("Liian nuori.")',
      difficulty: 'medium',
      xpReward: 20,
      orderIndex: 1,
      hints: {
        fi: [
          'Käytä if-lausetta',
          'Vertaa ikää >= 15',
          'Muista sisennys (4 välilyöntiä)'
        ],
        en: [
          'Use an if statement',
          'Compare age >= 15',
          'Remember indentation (4 spaces)'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Tervetuloa!',
          hidden: false
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 2.1.1...');
    await db.collection('codingExercises').doc(exercise2_1_1.id).set(exercise2_1_1);

    // Lesson 2.2: Loops
    const lesson2_2 = {
      id: 'lesson-2-2-loops',
      moduleId: module2.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Silmukat',
        en: 'Loops'
      },
      content: {
        fi: `# Silmukat

Silmukat toistavat koodia useita kertoja. Tämä säästää aikaa ja tekee koodista lyhyemmän.

## For-silmukka

\`\`\`python
for i in range(5):
    print("Numero:", i)
# Tulostaa numerot 0-4
\`\`\`

## While-silmukka

\`\`\`python
laskuri = 0
while laskuri < 5:
    print("Laskuri:", laskuri)
    laskuri = laskuri + 1
\`\`\`

## Listan läpikäynti

\`\`\`python
hedelmät = ["omena", "banaani", "appelsiini"]
for hedelmä in hedelmät:
    print("Pidän", hedelmä + "sta")
\`\`\``,
        en: `# Loops

Loops repeat code multiple times. This saves time and makes code shorter.

## For Loop

\`\`\`python
for i in range(5):
    print("Number:", i)
# Prints numbers 0-4
\`\`\`

## While Loop

\`\`\`python
counter = 0
while counter < 5:
    print("Counter:", counter)
    counter = counter + 1
\`\`\`

## Iterating Through a List

\`\`\`python
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print("I like", fruit)
\`\`\``
      },
      orderIndex: 2,
      estimatedMinutes: 30,
      videoUrl: null,
      createdAt: new Date()
    };

    console.log('📝 Creating Lesson 2.2...');
    await db.collection('codingLessons').doc(lesson2_2.id).set(lesson2_2);

    // Exercise 2.2.1: Count to 10
    const exercise2_2_1 = {
      id: 'exercise-2-2-1-count-to-10',
      lessonId: lesson2_2.id,
      moduleId: module2.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Laske kymmeneen',
        en: 'Count to 10'
      },
      description: {
        fi: 'Käytä silmukkaa tulostaaksesi numerot 1-10.',
        en: 'Use a loop to print numbers 1-10.'
      },
      instructions: {
        fi: 'Kirjoita for-silmukka, joka tulostaa numerot 1-10, yksi per rivi.',
        en: 'Write a for loop that prints numbers 1-10, one per line.'
      },
      starterCode: '# Tulosta numerot 1-10\n',
      solution: 'for i in range(1, 11):\n    print(i)',
      difficulty: 'medium',
      xpReward: 25,
      orderIndex: 1,
      hints: {
        fi: [
          'Käytä range(1, 11) saadaksesi numerot 1-10',
          'range() loppuu yhtä ennen toista numeroa',
          'Muista sisennys'
        ],
        en: [
          'Use range(1, 11) to get numbers 1-10',
          'range() stops one before the second number',
          'Remember indentation'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: '1\n2\n3\n4\n5\n6\n7\n8\n9\n10',
          hidden: false
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 2.2.1...');
    await db.collection('codingExercises').doc(exercise2_2_1.id).set(exercise2_2_1);

    // Module 3: Functions
    const module3 = {
      id: 'module-3-functions',
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Funktiot',
        en: 'Functions'
      },
      description: {
        fi: 'Opi luomaan ja käyttämään funktioita',
        en: 'Learn to create and use functions'
      },
      orderIndex: 3,
      estimatedMinutes: 75,
      createdAt: new Date()
    };

    console.log('📖 Creating Module 3...');
    await db.collection('codingModules').doc(module3.id).set(module3);

    // Lesson 3.1: Functions
    const lesson3_1 = {
      id: 'lesson-3-1-functions',
      moduleId: module3.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Funktiot',
        en: 'Functions'
      },
      content: {
        fi: `# Funktiot

Funktio on koodin pala, jonka voit käyttää uudelleen. Se tekee koodista siistimpää ja helpommin ymmärrettävää.

## Funktion luominen

\`\`\`python
def tervehdi():
    print("Hei!")
    print("Tervetuloa!")

# Funktion kutsuminen
tervehdi()
\`\`\`

## Parametrit

\`\`\`python
def tervehdi_nimellä(nimi):
    print("Hei,", nimi + "!")

tervehdi_nimellä("Matti")
# Tulostaa: Hei, Matti!
\`\`\`

## Paluuarvot

\`\`\`python
def laske_summa(a, b):
    return a + b

tulos = laske_summa(5, 3)
print(tulos)  # Tulostaa: 8
\`\`\``,
        en: `# Functions

A function is a piece of code you can reuse. It makes code cleaner and easier to understand.

## Creating a Function

\`\`\`python
def greet():
    print("Hello!")
    print("Welcome!")

# Calling the function
greet()
\`\`\`

## Parameters

\`\`\`python
def greet_name(name):
    print("Hello,", name + "!")

greet_name("John")
# Prints: Hello, John!
\`\`\`

## Return Values

\`\`\`python
def calculate_sum(a, b):
    return a + b

result = calculate_sum(5, 3)
print(result)  # Prints: 8
\`\`\``
      },
      orderIndex: 1,
      estimatedMinutes: 30,
      videoUrl: null,
      createdAt: new Date()
    };

    console.log('📝 Creating Lesson 3.1...');
    await db.collection('codingLessons').doc(lesson3_1.id).set(lesson3_1);

    // Exercise 3.1.1: Create a Function
    const exercise3_1_1 = {
      id: 'exercise-3-1-1-create-function',
      lessonId: lesson3_1.id,
      moduleId: module3.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Luo funktio',
        en: 'Create a Function'
      },
      description: {
        fi: 'Luo funktio, joka tervehtii käyttäjää.',
        en: 'Create a function that greets the user.'
      },
      instructions: {
        fi: 'Luo funktio nimeltä "tervehdi", joka tulostaa "Hei!" ja kutsu sitä.',
        en: 'Create a function called "greet" that prints "Hello!" and call it.'
      },
      starterCode: '# Luo funktio tervehdi\n',
      solution: 'def tervehdi():\n    print("Hei!")\n\ntervehdi()',
      difficulty: 'medium',
      xpReward: 30,
      orderIndex: 1,
      hints: {
        fi: [
          'Käytä def-avainsanaa',
          'Muista kaksoispiste funktion nimen jälkeen',
          'Sisennä funktion sisältö',
          'Kutsu funktiota kirjoittamalla sen nimi ja sulut'
        ],
        en: [
          'Use the def keyword',
          'Remember colon after function name',
          'Indent the function body',
          'Call the function by writing its name and parentheses'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Hei!',
          hidden: false
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 3.1.1...');
    await db.collection('codingExercises').doc(exercise3_1_1.id).set(exercise3_1_1);

    // Exercise 3.1.2: Function with Parameters
    const exercise3_1_2 = {
      id: 'exercise-3-1-2-function-parameters',
      lessonId: lesson3_1.id,
      moduleId: module3.id,
      courseId: pythonBasicsCourse.id,
      title: {
        fi: 'Funktio parametreilla',
        en: 'Function with Parameters'
      },
      description: {
        fi: 'Luo funktio, joka ottaa parametrin ja käyttää sitä.',
        en: 'Create a function that takes a parameter and uses it.'
      },
      instructions: {
        fi: 'Luo funktio "laske_neliö", joka ottaa luvun parametrina ja palauttaa sen neliön. Kutsu funktiota luvulla 5 ja tulosta tulos.',
        en: 'Create a function "calculate_square" that takes a number as parameter and returns its square. Call the function with 5 and print the result.'
      },
      starterCode: '# Luo funktio laske_neliö\n',
      solution: 'def laske_neliö(luku):\n    return luku * luku\n\ntulos = laske_neliö(5)\nprint(tulos)',
      difficulty: 'medium',
      xpReward: 35,
      orderIndex: 2,
      hints: {
        fi: [
          'Funktio ottaa yhden parametrin',
          'Käytä return palauttaaksesi arvon',
          'Neliö = luku * luku',
          'Tallenna paluuarvo muuttujaan'
        ],
        en: [
          'Function takes one parameter',
          'Use return to return a value',
          'Square = number * number',
          'Store return value in a variable'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: '25',
          hidden: false
        }
      ],
      createdAt: new Date()
    };

    console.log('✏️ Creating Exercise 3.1.2...');
    await db.collection('codingExercises').doc(exercise3_1_2.id).set(exercise3_1_2);

    console.log('✅ Coding platform seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('- 1 Course (Python Basics)');
    console.log('- 3 Modules');
    console.log('- 5 Lessons');
    console.log('- 8 Exercises');
    console.log('\n🎉 Students can now start learning!');

  } catch (error) {
    console.error('❌ Error seeding coding platform:', error);
    throw error;
  }
}

// Run the seed function
seedCodingPlatform()
  .then(() => {
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
