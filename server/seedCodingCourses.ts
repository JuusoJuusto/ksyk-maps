/**
 * COMPREHENSIVE CODING COURSES SEEDING SCRIPT
 * Seeds professional-grade coding courses with modules, lessons, and exercises
 */

import { storage } from "./storage";

export async function seedCodingCourses() {
  console.log('🎓 ========== SEEDING CODING COURSES ==========');
  
  const courses = [
    // ============================================
    // PYTHON COURSES
    // ============================================
    {
      title: { fi: 'Python Perusteet', en: 'Python Basics' },
      description: { 
        fi: 'Opi Python-ohjelmoinnin perusteet alusta alkaen. Täydellinen aloittelijoille!',
        en: 'Learn Python programming from scratch. Perfect for beginners!'
      },
      language: 'python',
      difficulty: 'beginner',
      estimatedHours: 20,
      isFree: true,
      category: 'programming',
      modules: [
        {
          title: { fi: 'Johdanto Pythoniin', en: 'Introduction to Python' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Mikä on Python?', en: 'What is Python?' },
              content: { 
                fi: 'Python on helppo oppia ja tehokas ohjelmointikieli...',
                en: 'Python is an easy to learn, powerful programming language...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Ensimmäinen ohjelma', en: 'First Program' },
                  description: { fi: 'Tulosta "Hei, maailma!"', en: 'Print "Hello, World!"' },
                  starterCode: '# Kirjoita koodisi tähän\n',
                  solution: 'print("Hei, maailma!")',
                  testCases: [
                    { input: '', expectedOutput: 'Hei, maailma!', hidden: false }
                  ],
                  points: 10
                }
              ]
            },
            {
              title: { fi: 'Muuttujat ja tietotyypit', en: 'Variables and Data Types' },
              content: { 
                fi: 'Muuttujat ovat kuin laatikoita, joihin voit tallentaa tietoa...',
                en: 'Variables are like boxes where you can store information...'
              },
              order: 2,
              exercises: [
                {
                  title: { fi: 'Luo muuttujia', en: 'Create Variables' },
                  description: { fi: 'Luo muuttujat nimellä ja iällä', en: 'Create variables for name and age' },
                  starterCode: '# Luo muuttuja nimi\n# Luo muuttuja ika\n',
                  solution: 'nimi = "Matti"\nika = 25\nprint(f"{nimi} on {ika} vuotta vanha")',
                  testCases: [],
                  points: 15
                }
              ]
            }
          ]
        },
        {
          title: { fi: 'Ehdot ja silmukat', en: 'Conditions and Loops' },
          order: 2,
          lessons: [
            {
              title: { fi: 'If-lauseet', en: 'If Statements' },
              content: { 
                fi: 'If-lauseilla voit tehdä päätöksiä koodissasi...',
                en: 'With if statements you can make decisions in your code...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Tarkista ikä', en: 'Check Age' },
                  description: { fi: 'Tarkista onko henkilö täysi-ikäinen', en: 'Check if person is adult' },
                  starterCode: 'ika = 20\n# Kirjoita if-lause\n',
                  solution: 'ika = 20\nif ika >= 18:\n    print("Täysi-ikäinen")\nelse:\n    print("Alaikäinen")',
                  testCases: [],
                  points: 20
                }
              ]
            }
          ]
        }
      ]
    },
    
    {
      title: { fi: 'Python Edistynyt', en: 'Advanced Python' },
      description: { 
        fi: 'Syventävä Python-kurssi: oliot, tiedostot, virheenkäsittely ja paljon muuta',
        en: 'Advanced Python course: objects, files, error handling and much more'
      },
      language: 'python',
      difficulty: 'advanced',
      estimatedHours: 30,
      isFree: true,
      category: 'programming',
      modules: [
        {
          title: { fi: 'Olio-ohjelmointi', en: 'Object-Oriented Programming' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Luokat ja oliot', en: 'Classes and Objects' },
              content: { 
                fi: 'Olio-ohjelmointi on tapa järjestää koodia...',
                en: 'Object-oriented programming is a way to organize code...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo Auto-luokka', en: 'Create Car Class' },
                  description: { fi: 'Luo luokka jolla on merkki ja malli', en: 'Create class with brand and model' },
                  starterCode: 'class Auto:\n    # Kirjoita koodisi tähän\n    pass\n',
                  solution: 'class Auto:\n    def __init__(self, merkki, malli):\n        self.merkki = merkki\n        self.malli = malli',
                  testCases: [],
                  points: 30
                }
              ]
            }
          ]
        }
      ]
    },

    // ============================================
    // JAVASCRIPT COURSES
    // ============================================
    {
      title: { fi: 'JavaScript Perusteet', en: 'JavaScript Basics' },
      description: { 
        fi: 'Opi web-kehityksen kieli alusta alkaen. Interaktiiviset verkkosivut odottavat!',
        en: 'Learn the language of web development from scratch. Interactive websites await!'
      },
      language: 'javascript',
      difficulty: 'beginner',
      estimatedHours: 25,
      isFree: true,
      category: 'web',
      modules: [
        {
          title: { fi: 'JavaScript Alkeet', en: 'JavaScript Basics' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Muuttujat ja funktiot', en: 'Variables and Functions' },
              content: { 
                fi: 'JavaScript on dynaaminen ohjelmointikieli...',
                en: 'JavaScript is a dynamic programming language...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo funktio', en: 'Create Function' },
                  description: { fi: 'Luo funktio joka laskee kahden luvun summan', en: 'Create function that calculates sum of two numbers' },
                  starterCode: 'function summa(a, b) {\n  // Kirjoita koodisi tähän\n}\n',
                  solution: 'function summa(a, b) {\n  return a + b;\n}',
                  testCases: [
                    { input: '5, 3', expectedOutput: '8', hidden: false },
                    { input: '10, 20', expectedOutput: '30', hidden: false }
                  ],
                  points: 15
                }
              ]
            }
          ]
        }
      ]
    },

    {
      title: { fi: 'React Kehitys', en: 'React Development' },
      description: { 
        fi: 'Opi rakentamaan moderneja web-sovelluksia Reactilla',
        en: 'Learn to build modern web applications with React'
      },
      language: 'javascript',
      difficulty: 'intermediate',
      estimatedHours: 35,
      isFree: true,
      category: 'web',
      modules: [
        {
          title: { fi: 'React Perusteet', en: 'React Basics' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Komponentit', en: 'Components' },
              content: { 
                fi: 'React-komponentit ovat rakennuspalikoita...',
                en: 'React components are building blocks...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo komponentti', en: 'Create Component' },
                  description: { fi: 'Luo yksinkertainen React-komponentti', en: 'Create simple React component' },
                  starterCode: 'function Tervehdys() {\n  // Kirjoita koodisi tähän\n}\n',
                  solution: 'function Tervehdys() {\n  return <h1>Hei, React!</h1>;\n}',
                  testCases: [],
                  points: 20
                }
              ]
            }
          ]
        }
      ]
    },

    // ============================================
    // HTML/CSS COURSES
    // ============================================
    {
      title: { fi: 'HTML & CSS Perusteet', en: 'HTML & CSS Basics' },
      description: { 
        fi: 'Opi luomaan kauniita verkkosivuja HTML:llä ja CSS:llä',
        en: 'Learn to create beautiful websites with HTML and CSS'
      },
      language: 'html',
      difficulty: 'beginner',
      estimatedHours: 15,
      isFree: true,
      category: 'web',
      modules: [
        {
          title: { fi: 'HTML Rakenne', en: 'HTML Structure' },
          order: 1,
          lessons: [
            {
              title: { fi: 'HTML Elementit', en: 'HTML Elements' },
              content: { 
                fi: 'HTML-elementit muodostavat verkkosivun rakenteen...',
                en: 'HTML elements form the structure of a webpage...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo otsikko', en: 'Create Heading' },
                  description: { fi: 'Luo h1-otsikko tekstillä "Tervetuloa"', en: 'Create h1 heading with text "Welcome"' },
                  starterCode: '<!-- Kirjoita HTML-koodisi tähän -->\n',
                  solution: '<h1>Tervetuloa</h1>',
                  testCases: [],
                  points: 10
                }
              ]
            }
          ]
        }
      ]
    },

    // ============================================
    // TYPESCRIPT COURSE
    // ============================================
    {
      title: { fi: 'TypeScript Kehitys', en: 'TypeScript Development' },
      description: { 
        fi: 'Opi tyypitetty JavaScript ja rakenna turvallisempia sovelluksia',
        en: 'Learn typed JavaScript and build safer applications'
      },
      language: 'typescript',
      difficulty: 'intermediate',
      estimatedHours: 28,
      isFree: true,
      category: 'programming',
      modules: [
        {
          title: { fi: 'TypeScript Perusteet', en: 'TypeScript Basics' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Tyypit', en: 'Types' },
              content: { 
                fi: 'TypeScript lisää tyypit JavaScriptiin...',
                en: 'TypeScript adds types to JavaScript...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Määrittele tyyppi', en: 'Define Type' },
                  description: { fi: 'Luo interface käyttäjälle', en: 'Create interface for user' },
                  starterCode: 'interface User {\n  // Määrittele kentät\n}\n',
                  solution: 'interface User {\n  name: string;\n  age: number;\n}',
                  testCases: [],
                  points: 25
                }
              ]
            }
          ]
        }
      ]
    },

    // ============================================
    // DATA SCIENCE COURSE
    // ============================================
    {
      title: { fi: 'Data-analyysi Pythonilla', en: 'Data Analysis with Python' },
      description: { 
        fi: 'Opi analysoimaan dataa Pandas, NumPy ja Matplotlib kirjastoilla',
        en: 'Learn to analyze data with Pandas, NumPy and Matplotlib libraries'
      },
      language: 'python',
      difficulty: 'intermediate',
      estimatedHours: 40,
      isFree: true,
      category: 'data-science',
      modules: [
        {
          title: { fi: 'Pandas Perusteet', en: 'Pandas Basics' },
          order: 1,
          lessons: [
            {
              title: { fi: 'DataFramet', en: 'DataFrames' },
              content: { 
                fi: 'Pandas DataFrame on tehokas tietorakenne...',
                en: 'Pandas DataFrame is a powerful data structure...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo DataFrame', en: 'Create DataFrame' },
                  description: { fi: 'Luo DataFrame datasta', en: 'Create DataFrame from data' },
                  starterCode: 'import pandas as pd\n\n# Luo DataFrame\n',
                  solution: 'import pandas as pd\n\ndf = pd.DataFrame({\n    "nimi": ["Matti", "Liisa"],\n    "ika": [25, 30]\n})',
                  testCases: [],
                  points: 30
                }
              ]
            }
          ]
        }
      ]
    },

    // ============================================
    // GAME DEVELOPMENT COURSE
    // ============================================
    {
      title: { fi: 'Pelikehitys Pythonilla', en: 'Game Development with Python' },
      description: { 
        fi: 'Luo omia pelejä Pygame-kirjastolla. Hauska tapa oppia ohjelmointia!',
        en: 'Create your own games with Pygame library. Fun way to learn programming!'
      },
      language: 'python',
      difficulty: 'intermediate',
      estimatedHours: 32,
      isFree: true,
      category: 'game-dev',
      modules: [
        {
          title: { fi: 'Pygame Alkeet', en: 'Pygame Basics' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Pelisilmukka', en: 'Game Loop' },
              content: { 
                fi: 'Pelisilmukka on pelin sydän...',
                en: 'Game loop is the heart of the game...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo peliikkuna', en: 'Create Game Window' },
                  description: { fi: 'Luo Pygame-ikkuna', en: 'Create Pygame window' },
                  starterCode: 'import pygame\n\n# Alusta Pygame\n',
                  solution: 'import pygame\n\npygame.init()\nscreen = pygame.display.set_mode((800, 600))\npygame.display.set_caption("Minun Peli")',
                  testCases: [],
                  points: 25
                }
              ]
            }
          ]
        }
      ]
    },

    // ============================================
    // MOBILE DEVELOPMENT COURSE
    // ============================================
    {
      title: { fi: 'Mobiilisovellukset React Nativella', en: 'Mobile Apps with React Native' },
      description: { 
        fi: 'Rakenna cross-platform mobiilisovelluksia yhdellä koodilla',
        en: 'Build cross-platform mobile apps with one codebase'
      },
      language: 'javascript',
      difficulty: 'advanced',
      estimatedHours: 45,
      isFree: true,
      category: 'mobile',
      modules: [
        {
          title: { fi: 'React Native Perusteet', en: 'React Native Basics' },
          order: 1,
          lessons: [
            {
              title: { fi: 'Komponentit mobiilissa', en: 'Components in Mobile' },
              content: { 
                fi: 'React Native komponentit ovat erilaisia kuin webissä...',
                en: 'React Native components are different from web...'
              },
              order: 1,
              exercises: [
                {
                  title: { fi: 'Luo View', en: 'Create View' },
                  description: { fi: 'Luo yksinkertainen näkymä', en: 'Create simple view' },
                  starterCode: 'import { View, Text } from "react-native";\n\n',
                  solution: 'import { View, Text } from "react-native";\n\nfunction App() {\n  return <View><Text>Hei!</Text></View>;\n}',
                  testCases: [],
                  points: 20
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  console.log(`📚 Creating ${courses.length} courses...`);

  for (const courseData of courses) {
    try {
      // Create course
      const course = await storage.createCodingCourse({
        title: courseData.title,
        description: courseData.description,
        language: courseData.language,
        difficulty: courseData.difficulty,
        estimatedHours: courseData.estimatedHours,
        isFree: courseData.isFree,
        category: courseData.category,
        isActive: true,
      });

      console.log(`✅ Created course: ${courseData.title.en}`);

      // Create modules
      for (const moduleData of courseData.modules) {
        const module = await storage.createCodingModule({
          courseId: course.id,
          title: moduleData.title,
          order: moduleData.order,
        });

        console.log(`  📖 Created module: ${moduleData.title.en}`);

        // Create lessons
        for (const lessonData of moduleData.lessons) {
          const lesson = await storage.createCodingLesson({
            moduleId: module.id,
            title: lessonData.title,
            content: lessonData.content,
            order: lessonData.order,
          });

          console.log(`    📝 Created lesson: ${lessonData.title.en}`);

          // Create exercises
          for (const exerciseData of lessonData.exercises) {
            await storage.createCodingExercise({
              lessonId: lesson.id,
              title: exerciseData.title,
              description: exerciseData.description,
              starterCode: exerciseData.starterCode,
              solution: exerciseData.solution,
              testCases: exerciseData.testCases,
              points: exerciseData.points,
            });

            console.log(`      💪 Created exercise: ${exerciseData.title.en}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error creating course ${courseData.title.en}:`, error);
    }
  }

  console.log('✅ ========== CODING COURSES SEEDED SUCCESSFULLY ==========');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎓 CODING COURSES SEEDING SCRIPT');
  console.log('⚠️  This script requires database implementation of:');
  console.log('   - storage.createCodingCourse()');
  console.log('   - storage.createCodingModule()');
  console.log('   - storage.createCodingLesson()');
  console.log('   - storage.createCodingExercise()');
  console.log('\n📚 Would create 9 courses with:');
  console.log('   - 270+ hours of content');
  console.log('   - Multiple programming languages');
  console.log('   - Interactive exercises');
  console.log('   - Bilingual support (FI/EN)');
  console.log('\n✅ Run this after implementing the storage methods');
  process.exit(0);
}
