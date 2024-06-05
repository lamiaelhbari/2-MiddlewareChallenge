console.log = function() {};
const fs = require('fs');
const expect = require('chai').expect;
const assert = require('chai').assert;
const code = fs.readFileSync('app.js', 'utf8');
const Structured = require('structured');
const request = require('supertest');
const rewire = require('rewire');
process.env.IS_TEST_ENV = true;

describe('', function() {
  it('', function(done) {
    const appUseStruct = function() {
      app.use($route, (req, res, next) => {
        const cardId = Number(req.params.cardId);
        const cardIndex = cards.findIndex(card => card.id === cardId);
        if (cardIndex === -1) {
          return res.status(404).send($resMessage);
        }
      });
    }

    appUseCallbacks = [
      function($route, $resMessage) {
        return $route.value === '/cards/:cardId' && $resMessage.value === 'Card not found';
      }
    ];

    const isMatch =  Structured.match(code, appUseStruct, {varCallbacks: appUseCallbacks});
    let failureMessage = 'Did did you add the card-checking logic from a `/cards/:cardId` route to your `app.use()` callback matching `/cards/:cardId`?';
    assert.isOk(isMatch, failureMessage);

    process.env.PORT = 8001;
    const appModule = rewire('../app.js');
    const app = appModule.__get__('app');
    const appUse = app._router.stack.find(layer => {
      if (layer.keys.length > 0) {
        // Find the app.use('cards/:cardId') handler
        return layer.keys[0].name === 'cardId';
      }
      return false;
    })
    expect(appUse).to.not.be.undefined;
    const req = {
      params: {
        cardId: '1',
      }
    }
    const res = {
      status: function() { return this },
      send: function() {}
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    }
    // Call the learner's middleware function
    const cards = appModule.__get__('cards');
    const foundIndex = cards.findIndex(card => card.id === 1);
    appUse.handle(req, res, next);
    expect(req.cardIndex, 'Did you set the `req.cardIndex` property to the request object?').to.be.a('number');
    expect(req.cardIndex, 'Did you set `req.cardIndex` equal to the correct array index of `cards`?').to.equal(foundIndex);
    expect(nextCalled, 'Did you call `next()`?').to.be.true;

    const duplicateRegex = /res\s*\.\s*status\s*\(\s*404\s*\)\s*\.\s*send\s*\(\s*(['"])Card not found\1\s*\)/g;
    const duplicateMatch = code.match(duplicateRegex);
    expect(duplicateMatch, 'Did you replicate the 404 status code sending in your middleware?').to.not.be.null;
    expect(duplicateMatch.length, 'Did you remove the duplicate logic in the checkpoint from `/cards/:cardId` routes?').to.be.equal(1);

    // Ensure that 404s still get sent.
    request(app)
    .get('/cards/badId')
    .then((response) => {
      expect(response.status, 'Your application should still send 404 responses for invalid id numbers.').to.equal(404);
    })
    .then(() => {
      return request(app)
      .post('/cards/')
      .send({
        suit: 'Invalid',
        rank: '2',
      });
    })
    .then(response => {
      expect(response.status, 'Your should still allow for proper app.post behavior').to.equal(400)
    })
    .then(() => {
      return request(app)
      .post('/cards/')
      .send({
        suit: 'Clubs',
        rank: '3',
      });
    })
    .then(response => {
      console.log('body', response.body)
      expect(response.status, 'Your should still allow for proper app.post behavior').to.equal(201);
    })
    .then(() => {
      return request(app)
      .get('/cards/1');
    })
    .then(response => {
      expect(response.status).to.equal(200);
      expect(response.body, 'Your middleware should not change how `GET /cards/:cardId` behaves.').to.deep.equal(appModule.__get__('cards')[0])
    })
    .then(() => {
      return request(app)
      .put('/cards/1')
      .send({
        suit: 'Diamonds',
        rank: 'Ace',
      });
    })
    .then((response) => {
      console.log(response);
      expect(response.body).to.deep.equal({
        id: 1,
        suit: 'Diamonds',
        rank: 'Ace',
      });
      expect(response.body, 'Your middleware should not change how `PUT /cards/:cardId` behaves.').to.deep.equal(appModule.__get__('cards')[0]);
    })
    .then(() => {
      return request(app)
      .del('/cards/1');
    })
    .then(response => {
      expect(response.status, 'Your middleware should not change how `DELETE /cards/:cardId` behaves.').to.equal(204);
      const cards = appModule.__get__('cards');
      const foundIndex = cards.findIndex(card => card.id === 1);
      expect(foundIndex, 'Your middleware should not change how `DELETE /cards/:cardId` behaves.').to.equal(-1);
      done();
    })
    .catch(done);
  });
});