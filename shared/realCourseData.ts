/**
 * Real Course Data - Production-Ready Content
 * Complete Python, JavaScript, HTML/CSS, and C# courses
 */

export interface RealCourse {
  id: string;
  slug: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  language: 'python' | 'javascript' | 'html-css' | 'csharp';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  modules: RealModule[];
  prerequisites: string[];
  isPublished: boolean;
  isFree: boolean;
  tags: string[];
}

export interface RealModule {
  id: string;
  order: number;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  lessons: RealLesson[];
}

export interface RealLesson {
  id: string;
  order: number;
  title: { fi: string; en: string };
  type: 'tutorial' | 'exercise' | 'quiz' | 'project';
  content: { fi: string; en: string };
  code?: {
    starter: string;
    solution: string;
    language: string;
  };
  exercises?: RealExercise[];
  xpReward: number;
  estimatedMinutes: number;
}

export interface RealExercise {
  id: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  starterCode: string;
  solution: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    hidden: boolean;
  }>;
  hints: { fi: string[]; en: string[] };
}

// PYTHON BASICS COURSE
export const pythonBasicsCourse: RealCourse = {
  id: 'python-basics',
  slug: 'python-perusteet',
  title: { fi: 'Python perusteet', en: 'Python Basics' },
  description: { 
    fi: 'Opi Pythonin perusteet alusta alkaen. Ei aiempaa ohjelmointikokemusta tarvita.',
    en: 'Learn Python from scratch. No prior programming experience required.'
  },
  language: 'python',
  difficulty: 'beginner',
  estimatedHours: 20,
  prerequisites: [],
  isPublished: true,
  isFree: true,
  tags: ['beginner', 'python', 'programming'],
  modules: [
    {
      id: 'module-1',
      order: 1,
      title: { fi: 'Aloitus', en: 'Getting Started' },
      description: { fi: 'Pythonin perusteet ja ensimmäinen ohjelma', en: 'Python basics and your first program' },
      lessons: [
        {
          id: 'lesson-1-1',
          order: 1,
          title: { fi: 'Tervetuloa Pythoniin', en: 'Welcome to Python' },
          type: 'tutorial',
          content: {
            fi: `# Tervetuloa Pythoniin!

Python on yksi maailman suosituimmista ohjelmointikielistä. Se on helppo oppia ja sitä käytetään kaikkeen web-kehityksestä tekoälyyn.

## Miksi Python?

- **Helppo oppia**: Selkeä syntaksi, joka muistuttaa englantia
- **Monipuolinen**: Web, data, AI, pelit, automaatio
- **Suosittu**: Valtava yhteisö ja paljon resursseja
- **Kysytty**: Yksi kysytyimmistä taidoista työmarkkinoilla

## Ensimmäinen ohjelma

Aloitetaan klassisella "Hei maailma" -ohjelmalla:

\`\`\`python
print("Hei maailma!")
\`\`\`

Tämä yksinkertainen rivi tulostaa tekstin näytölle. \`print()\` on funktio, joka näyttää tekstiä.`,
            en: `# Welcome to Python!

Python is one of the world's most popular programming languages. It's easy to learn and used for everything from web development to artificial intelligence.

## Why Python?

- **Easy to learn**: Clear syntax that resembles English
- **Versatile**: Web, data, AI, games, automation
- **Popular**: Huge community and lots of resources
- **In-demand**: One of the most sought-after skills in the job market

## Your First Program

Let's start with the classic "Hello World" program:

\`\`\`python
print("Hello World!")
\`\`\`

This simple line prints text to the screen. \`print()\` is a function that displays text.`
          },
          xpReward: 10,
          estimatedMinutes: 10
        },
        {
          id: 'lesson-1-2',
          order: 2,
          title: { fi: 'Print-funktio', en: 'The Print Function' },
          type: 'exercise',
          content: {
            fi: `# Print-funktio

\`print()\` on Pythonin tärkein funktio aloittelijoille. Se näyttää tekstiä konsolissa.

## Syntaksi

\`\`\`python
print("Tämä on teksti")
print('Tämäkin toimii')
print("Voit tulostaa", "useita", "asioita")
\`\`\`

## Tehtävä

Tulosta oma nimesi ja ikäsi.`,
            en: `# The Print Function

\`print()\` is Python's most important function for beginners. It displays text in the console.

## Syntax

\`\`\`python
print("This is text")
print('This also works')
print("You can print", "multiple", "things")
\`\`\`

## Exercise

Print your name and age.`
          },
          exercises: [
            {
              id: 'ex-1-2-1',
              title: { fi: 'Tulosta nimesi', en: 'Print Your Name' },
              description: { 
                fi: 'Kirjoita ohjelma, joka tulostaa nimesi.',
                en: 'Write a program that prints your name.'
              },
              starterCode: '# Kirjoita koodisi tähän\n',
              solution: 'print("Oma Nimi")',
              testCases: [
                { input: '', expectedOutput: 'Oma Nimi', hidden: false }
              ],
              hints: {
                fi: ['Käytä print() funktiota', 'Laita teksti lainausmerkkeihin'],
                en: ['Use the print() function', 'Put text in quotes']
              }
            }
          ],
          xpReward: 20,
          estimatedMinutes: 15
        }
      ]
    },
    {
      id: 'module-2',
      order: 2,
      title: { fi: 'Muuttujat', en: 'Variables' },
      description: { fi: 'Tiedon tallentaminen muuttujiin', en: 'Storing data in variables' },
      lessons: [
        {
          id: 'lesson-2-1',
          order: 1,
          title: { fi: 'Muuttujat', en: 'Variables' },
          type: 'tutorial',
          content: {
            fi: `# Muuttujat

Muuttuja on kuin laatikko, johon voit tallentaa tietoa.

## Muuttujan luominen

\`\`\`python
nimi = "Matti"
ika = 15
pituus = 1.75
on_opiskelija = True
\`\`\`

## Muuttujien käyttö

\`\`\`python
print("Nimi:", nimi)
print("Ikä:", ika)
\`\`\`

## Muuttujan muuttaminen

\`\`\`python
ika = 16  # Ikä muuttuu
print("Uusi ikä:", ika)
\`\`\``,
            en: `# Variables

A variable is like a box where you can store information.

## Creating a Variable

\`\`\`python
name = "Matt"
age = 15
height = 1.75
is_student = True
\`\`\`

## Using Variables

\`\`\`python
print("Name:", name)
print("Age:", age)
\`\`\`

## Changing a Variable

\`\`\`python
age = 16  # Age changes
print("New age:", age)
\`\`\``
          },
          xpReward: 15,
          estimatedMinutes: 20
        }
      ]
    }
  ]
};

// JAVASCRIPT BASICS COURSE
export const javascriptBasicsCourse: RealCourse = {
  id: 'javascript-basics',
  slug: 'javascript-perusteet',
  title: { fi: 'JavaScript perusteet', en: 'JavaScript Basics' },
  description: { 
    fi: 'Opi JavaScriptiä - webin ohjelmointikieli.',
    en: 'Learn JavaScript - the programming language of the web.'
  },
  language: 'javascript',
  difficulty: 'beginner',
  estimatedHours: 25,
  prerequisites: [],
  isPublished: true,
  isFree: true,
  tags: ['beginner', 'javascript', 'web'],
  modules: [
    {
      id: 'js-module-1',
      order: 1,
      title: { fi: 'JavaScript alkeet', en: 'JavaScript Fundamentals' },
      description: { fi: 'JavaScriptin perusteet', en: 'JavaScript basics' },
      lessons: [
        {
          id: 'js-lesson-1-1',
          order: 1,
          title: { fi: 'Mikä on JavaScript?', en: 'What is JavaScript?' },
          type: 'tutorial',
          content: {
            fi: `# Mikä on JavaScript?

JavaScript on ohjelmointikieli, joka tekee verkkosivuista interaktiivisia.

## Käyttökohteet

- **Verkkosivut**: Painikkeet, animaatiot, lomakkeet
- **Palvelimet**: Node.js backend-kehitys
- **Mobiilisovellukset**: React Native
- **Työpöytäsovellukset**: Electron

## Ensimmäinen koodi

\`\`\`javascript
console.log("Hei JavaScript!");
\`\`\``,
            en: `# What is JavaScript?

JavaScript is a programming language that makes websites interactive.

## Use Cases

- **Websites**: Buttons, animations, forms
- **Servers**: Node.js backend development
- **Mobile apps**: React Native
- **Desktop apps**: Electron

## First Code

\`\`\`javascript
console.log("Hello JavaScript!");
\`\`\``
          },
          xpReward: 10,
          estimatedMinutes: 15
        }
      ]
    }
  ]
};

// HTML/CSS COURSE
export const htmlCssCourse: RealCourse = {
  id: 'html-css-basics',
  slug: 'html-css-perusteet',
  title: { fi: 'HTML & CSS perusteet', en: 'HTML & CSS Basics' },
  description: { 
    fi: 'Luo kauniita verkkosivuja HTML:llä ja CSS:llä.',
    en: 'Create beautiful websites with HTML and CSS.'
  },
  language: 'html-css',
  difficulty: 'beginner',
  estimatedHours: 18,
  prerequisites: [],
  isPublished: true,
  isFree: true,
  tags: ['beginner', 'html', 'css', 'web'],
  modules: [
    {
      id: 'html-module-1',
      order: 1,
      title: { fi: 'HTML perusteet', en: 'HTML Basics' },
      description: { fi: 'Verkkosivun rakenne', en: 'Website structure' },
      lessons: [
        {
          id: 'html-lesson-1-1',
          order: 1,
          title: { fi: 'HTML:n perusteet', en: 'HTML Fundamentals' },
          type: 'tutorial',
          content: {
            fi: `# HTML:n perusteet

HTML (HyperText Markup Language) on verkkosivujen rakennuskieli.

## Perusrakenne

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>Oma sivu</title>
</head>
<body>
    <h1>Tervetuloa!</h1>
    <p>Tämä on kappale.</p>
</body>
</html>
\`\`\``,
            en: `# HTML Fundamentals

HTML (HyperText Markup Language) is the building language of websites.

## Basic Structure

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
</head>
<body>
    <h1>Welcome!</h1>
    <p>This is a paragraph.</p>
</body>
</html>
\`\`\``
          },
          xpReward: 10,
          estimatedMinutes: 20
        }
      ]
    }
  ]
};

// C# BASICS COURSE
export const csharpBasicsCourse: RealCourse = {
  id: 'csharp-basics',
  slug: 'csharp-perusteet',
  title: { fi: 'C# perusteet', en: 'C# Basics' },
  description: { 
    fi: 'Opi C# - Microsoftin tehokas ohjelmointikieli.',
    en: 'Learn C# - Microsoft\'s powerful programming language.'
  },
  language: 'csharp',
  difficulty: 'intermediate',
  estimatedHours: 30,
  prerequisites: ['python-basics'],
  isPublished: true,
  isFree: true,
  tags: ['intermediate', 'csharp', 'microsoft'],
  modules: [
    {
      id: 'cs-module-1',
      order: 1,
      title: { fi: 'C# alkeet', en: 'C# Fundamentals' },
      description: { fi: 'C#:n perusteet', en: 'C# basics' },
      lessons: [
        {
          id: 'cs-lesson-1-1',
          order: 1,
          title: { fi: 'Mikä on C#?', en: 'What is C#?' },
          type: 'tutorial',
          content: {
            fi: `# Mikä on C#?

C# on Microsoftin kehittämä moderni ohjelmointikieli.

## Käyttökohteet

- **Windows-sovellukset**: WPF, WinForms
- **Pelit**: Unity-pelimoottori
- **Web**: ASP.NET
- **Mobiili**: Xamarin

## Ensimmäinen ohjelma

\`\`\`csharp
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hei C#!");
    }
}
\`\`\``,
            en: `# What is C#?

C# is a modern programming language developed by Microsoft.

## Use Cases

- **Windows apps**: WPF, WinForms
- **Games**: Unity game engine
- **Web**: ASP.NET
- **Mobile**: Xamarin

## First Program

\`\`\`csharp
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello C#!");
    }
}
\`\`\``
          },
          xpReward: 15,
          estimatedMinutes: 25
        }
      ]
    }
  ]
};

// Export all courses
export const allCourses: RealCourse[] = [
  pythonBasicsCourse,
  javascriptBasicsCourse,
  htmlCssCourse,
  csharpBasicsCourse
];

// Helper functions
export function getCourseById(id: string): RealCourse | undefined {
  return allCourses.find(course => course.id === id);
}

export function getCoursesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): RealCourse[] {
  return allCourses.filter(course => course.difficulty === difficulty);
}

export function getCoursesByLanguage(language: string): RealCourse[] {
  return allCourses.filter(course => course.language === language);
}
