const puppeteer = require('puppeteer');

let browser, page;
let words = ["about", "adult", "anger", "avoid", "badge", "badly", "begun", "below", "black", "board", "brick", "bring", "burst", "cards", "child", "chose", "count", "craft", "crisp", "crown", "crust", "dairy", "delay", "devil", "drank", "drive", "early", "extra", "facts", "faith", "fancy", "favor", "first", "flame", "flash", "fraud", "fried", "funky", "given", "glare", "godly", "guide", "handy", "haste", "honey", "icons", "image", "itchy", "jeans", "joker", "knife", "laser", "layer", "lemon", "liars", "micro", "mixed", "money", "motel", "noise", "north", "opens", "paint", "patio", "plant", "poems", "prize", "quiet", "rainy", "repay", "right", "risky", "rough", "shake", "shelf", "slide", "smart", "split", "stone", "table", "taxes", "thing", "thumb", "tired", "touch", "twice", "ultra", "unite", "video", "virus", "voice", "waste", "white", "whole", "width", "women", "world", "wreck", "years", "zoned"];
let possibleWords = [];

const fail = (q) => {
  possibleWords = words;
  const WordsWithFrequencies = getWordsWithFrequencies();

  for (let i = 0; i < 10; i++) {
    const { word } = selectWord(WordsWithFrequencies);

    const result = test(q, word);

    analyzeResults(result);

    if (result.positioned === 5) {
      return false;
    }
  }

  return true;
};

const test = (word, guess) => {
  const { letters, positioned } = word.split('').reduce(({ letters, positioned }, letter, index) => {
    if (guess[index] === letter) {
      letters++;
      positioned++;
    } else if (guess.includes(letter)) {
      letters++;
    }

    return {
      letters,
      positioned,
    };
  }, { letters: 0, positioned: 0 });

  return {
    letters, 
    positioned,
    word: guess,
  }
}

const init_game = async () => {
  // Open browser and a tab
  browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ['--window-size=500,800'],
  });

  // open tab page
  page = await browser.newPage();
  await page.setViewport({ width: 500, height: 800, deviceScaleFactor: 1 })

  // Open quina.app on new tab
  return page.goto('https://quina.app/game/', {
    waitUntil: 'networkidle0',
  });
}

const wait_for_next_game = async () => {
  await page.waitForFunction(() => {
    const firstButton = document.getElementsByClassName('button')[0];
    if (!firstButton) { return false; }

    const textContent = firstButton.textContent.trim();
    return textContent === 'Guess ""';
  }, { timeout: 0 });
}

const selectWord = (WordsWithFrequencies) => {
  return possibleWords.reduce((bestWord, word) => {
    let score = 0;
    for (i in word) {
      const letter = word[i];
      score += WordsWithFrequencies[letter];
    }

    return score < bestWord.score ? { word, score } : bestWord;
  }, { score: 1000 });
}

const getWordsWithFrequencies = () => {
  const chars = {};

  possibleWords.forEach((word) => {
    for (i in word) {
      const letter = word[i];
      if (!chars[letter]) { chars[letter] = 0; }
      chars[letter]++;
    };
  });

  return chars;
};

const makeGuess = async (word) => {
  await page.focus(`#input1`);
  await page.keyboard.type(word);
  await page.click('button');
  const element = await page.waitForSelector('.feedback');
  const value = await element.evaluate((el) => el.textContent);
  const numbers = value.split('/');
  const letters = parseInt(numbers[0].trim(' \n'));
  const positioned = parseInt(numbers[1].trim(' \n'));
  return { word, letters, positioned };
}

const analyzeResults = (result) => {
  possibleWords = possibleWords.reduce((res, currWord) => {
    if (currWord === result.word) { return res; }

    const commonLetters = currWord.split('').reduce((c, l) => {
      return result.word.includes(l) ? c + 1 : c;
    }, 0);

    if (commonLetters !== result.letters) { return res; }

    res.push(currWord);
    return res;
  }, []);
}

const play_game = async () => {
  const WordsWithFrequencies = getWordsWithFrequencies();

  for (let i = 0; i < 10; i++) {
    const { word } = selectWord(WordsWithFrequencies);

    const result = await makeGuess(word);

    analyzeResults(result);

    if (result.positioned === 5) { return; }
  }

  return;
}

(async () => {
  const fails = words.filter(fail);
  console.log(fails.length + ' Fails...\n\n');

  console.log('Player ready');

  await init_game();

  while (true) {
    possibleWords = words;

    await play_game();

    await wait_for_next_game();
  }
})();
