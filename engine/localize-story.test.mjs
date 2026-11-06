import assert from 'node:assert/strict';
import { localizeStory } from './localize-story.mjs';
const story = {id:'tiny',title:'Title',description:'Preview',start:'start',scenes:{start:{situation:'Hello',hint:'Help',ending:'good',choices:[{text:'Again',next:'$restart'},{text:'Home',next:'$home'}]}}};
const locale = {language:'gu',lines:{'tiny.title':'શીર્ષક','tiny.description':'વર્ણન','start.situation':'નમસ્તે','start.hint':'મદદ','start.choice.0':'ફરી','start.choice.1':'ઘર'}};
assert.equal(localizeStory(story, locale).scenes.start.situation,'નમસ્તે');
const missing = structuredClone(locale);delete missing.lines['start.choice.1'];
assert.throws(()=>localizeStory(story,missing),/Missing gu line/);
console.log('Localization completeness check passed.');
