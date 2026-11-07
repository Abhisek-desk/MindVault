$ErrorActionPreference = "Stop"

$root = "D:\MindVault\server"
$downloadFolder = Join-Path $root "public\downloads"
$tempFolder = Join-Path $root "temp-packs"

New-Item -ItemType Directory -Force -Path $downloadFolder | Out-Null
New-Item -ItemType Directory -Force -Path $tempFolder | Out-Null

$packs = @(
    @{
        Name = "web-development"
        Title = "Web Development Fundamentals"
        Lessons = @(
            @{
                File = "01-html.md"
                Content = @'
# HTML Fundamentals

HTML structures web pages.

## Basic document

    <!DOCTYPE html>
    <html>
      <head>
        <title>My Website</title>
      </head>
      <body>
        <h1>Hello World</h1>
        <p>My first webpage.</p>
      </body>
    </html>

## Important elements

- h1 to h6: Headings
- p: Paragraph
- a: Link
- img: Image
- ul and ol: Lists
- div: Container
- form: User input

## Exercise

Create a webpage containing a heading, paragraph and link.
'@
            },
            @{
                File = "02-css.md"
                Content = @'
# CSS Fundamentals

CSS controls the appearance of HTML pages.

## Example

    body {
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    }

    h1 {
      color: navy;
    }

## Box model

Every HTML element can have:

- Content
- Padding
- Border
- Margin

## Exercise

Create a card with a background, padding and rounded corners.
'@
            },
            @{
                File = "03-responsive-design.md"
                Content = @'
# Responsive Web Design

Responsive design makes websites work on different screen sizes.

## Viewport

Add this inside the HTML head:

    <meta name="viewport" content="width=device-width, initial-scale=1">

## Media query

    @media (max-width: 600px) {
      .container {
        padding: 12px;
      }
    }

## Best practices

- Use flexible layouts.
- Avoid fixed widths where possible.
- Test mobile screens.
- Make buttons easy to tap.

## Exercise

Create a two-column layout that becomes one column on mobile.
'@
            }
        )
    },
    @{
        Name = "javascript"
        Title = "JavaScript Complete Guide"
        Lessons = @(
            @{
                File = "01-basics.md"
                Content = @'
# JavaScript Basics

JavaScript adds behaviour and interactivity to websites.

## Variables

    const name = "Mind Vault";
    let score = 10;

Use const by default and let when reassignment is needed.

## Data types

- String
- Number
- Boolean
- Undefined
- Null
- Object
- Array

## Exercise

Create variables for your name, age and favourite programming language.
'@
            },
            @{
                File = "02-functions.md"
                Content = @'
# JavaScript Functions

Functions are reusable blocks of code.

## Function declaration

    function greet(name) {
      return "Hello " + name;
    }

## Arrow function

    const add = (a, b) => a + b;

## Exercise

Write a function that calculates the area of a rectangle.
'@
            },
            @{
                File = "03-arrays-objects.md"
                Content = @'
# Arrays and Objects

## Arrays

    const languages = ["JavaScript", "Python", "Java"];

Access an item using its index:

    console.log(languages[0]);

## Objects

    const student = {
      name: "Alex",
      age: 20
    };

Access a property:

    console.log(student.name);

## Exercise

Create an array of three student objects.
'@
            },
            @{
                File = "04-async.md"
                Content = @'
# Asynchronous JavaScript

Asynchronous operations allow work to continue without blocking the main thread.

## Promise

    const task = Promise.resolve("Completed");

## Async and await

    async function loadData() {
      const response = await fetch("/api/data");
      return response.json();
    }

## Exercise

Write an async function that fetches data from a public API.
'@
            }
        )
    },
    @{
        Name = "python"
        Title = "Python Programming Basics"
        Lessons = @(
            @{
                File = "01-introduction.md"
                Content = @'
# Python Introduction

Python is a general-purpose programming language.

## Hello World

    print("Hello, World!")

## Variables

    name = "Alex"
    age = 20

## Data types

- str
- int
- float
- bool
- list
- tuple
- dict

## Exercise

Write a program that displays your name and age.
'@
            },
            @{
                File = "02-conditions-loops.md"
                Content = @'
# Conditions and Loops

## Conditions

    age = 18

    if age >= 18:
        print("Adult")
    else:
        print("Minor")

## For loop

    for number in range(5):
        print(number)

## While loop

    count = 0

    while count < 5:
        print(count)
        count += 1

## Exercise

Print all even numbers from 1 to 50.
'@
            },
            @{
                File = "03-functions.md"
                Content = @'
# Python Functions

Functions organize reusable code.

## Example

    def greet(name):
        return f"Hello {name}"

    print(greet("Alex"))

## Default arguments

    def welcome(name="Student"):
        print(f"Welcome {name}")

## Exercise

Create a function that returns the largest of three numbers.
'@
            }
        )
    },
    @{
        Name = "dsa"
        Title = "Data Structures and Algorithms"
        Lessons = @(
            @{
                File = "01-arrays.md"
                Content = @'
# Arrays

An array stores elements in an ordered collection.

## Operations

- Access
- Insert
- Delete
- Search
- Update

Access by index is generally O(1).

Searching an unsorted array is O(n).

## Exercise

Find the largest element in an array.
'@
            },
            @{
                File = "02-linked-lists.md"
                Content = @'
# Linked Lists

A linked list contains nodes connected through references.

Each node stores:

- Data
- Reference to the next node

## Common operations

- Insert
- Delete
- Traverse
- Search

A singly linked list supports traversal in one direction.

## Exercise

Draw a linked list containing five nodes.
'@
            },
            @{
                File = "03-stacks-queues.md"
                Content = @'
# Stacks and Queues

## Stack

A stack follows LIFO: Last In, First Out.

Operations:

- Push
- Pop
- Peek

## Queue

A queue follows FIFO: First In, First Out.

Operations:

- Enqueue
- Dequeue
- Front

## Exercise

Describe how a browser's back button can use a stack.
'@
            },
            @{
                File = "04-complexity.md"
                Content = @'
# Algorithm Complexity

Big O notation describes how an algorithm scales.

## Common complexities

- O(1): Constant
- O(log n): Logarithmic
- O(n): Linear
- O(n log n): Linearithmic
- O(n²): Quadratic

## Exercise

Compare linear search and binary search.
Explain why binary search requires sorted data.
'@
            }
        )
    },
    @{
        Name = "computer-science"
        Title = "Computer Science Fundamentals"
        Lessons = @(
            @{
                File = "01-computers.md"
                Content = @'
# Computer Fundamentals

A computer processes data according to instructions.

## Main components

- CPU: Executes instructions.
- RAM: Temporary working memory.
- Storage: Keeps data.
- Motherboard: Connects components.
- Input devices: Send information.
- Output devices: Present information.

## Exercise

Explain the difference between RAM and storage.
'@
            },
            @{
                File = "02-operating-systems.md"
                Content = @'
# Operating Systems

An operating system manages computer resources.

## Responsibilities

- Process management
- Memory management
- File management
- Device management
- Security
- User interface

Examples include Windows, Linux, macOS and Android.

## Exercise

Explain why applications need an operating system.
'@
            },
            @{
                File = "03-networks.md"
                Content = @'
# Computer Networks

A computer network connects devices to exchange information.

## Concepts

- IP address
- Router
- Switch
- DNS
- HTTP
- HTTPS
- TCP
- UDP

## Client and server

A client requests a resource.
A server processes the request and responds.

## Exercise

Explain what happens when you open a website.
'@
            }
        )
    }
)

foreach ($pack in $packs) {
    $packFolder = Join-Path $tempFolder $pack.Name

    New-Item -ItemType Directory -Force -Path $packFolder | Out-Null

    $readme = @"
# $($pack.Title)

Welcome to this Mind Vault knowledge pack.

This pack contains offline learning materials.

## Contents

$($pack.Lessons.File -join "`n")

You can read these Markdown files using any text editor.

All lessons are available offline.
"@

    Set-Content `
        -Path (Join-Path $packFolder "README.md") `
        -Value $readme `
        -Encoding utf8

    foreach ($lesson in $pack.Lessons) {
        Set-Content `
            -Path (Join-Path $packFolder $lesson.File) `
            -Value $lesson.Content `
            -Encoding utf8
    }

    $zipPath = Join-Path $downloadFolder "$($pack.Name).zip"

    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    Compress-Archive `
        -Path "$packFolder\*" `
        -DestinationPath $zipPath `
        -CompressionLevel Optimal

    $size = (Get-Item $zipPath).Length

    Write-Host "$($pack.Title): $size bytes"
}

Remove-Item $tempFolder -Recurse -Force

Write-Host ""
Write-Host "All five knowledge packs created successfully!"