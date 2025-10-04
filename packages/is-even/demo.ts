import { isEven } from './src/index';

console.log('=== is-even Demo ===\n');

const testNumbers = [0, 1, 2, 3, 4, -2, -3, 100, 999];

testNumbers.forEach(num => {
  const result = isEven(num);
  console.log(`isEven(${num.toString().padStart(4)}) = ${result}`);
});

console.log('\n=== Use Cases ===\n');

// Filter even numbers from array
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evenNumbers = numbers.filter(isEven);
console.log('Even numbers from [1-10]:', evenNumbers);

// Conditional logic
const age = 42;
if (isEven(age)) {
  console.log(`Age ${age} is even - eligible for even-age discount!`);
}

// Array operations
const data = [15, 22, 33, 44, 55];
const hasEvenNumber = data.some(isEven);
const allEven = data.every(isEven);
console.log(`Has even number: ${hasEvenNumber}`);
console.log(`All even: ${allEven}`);
