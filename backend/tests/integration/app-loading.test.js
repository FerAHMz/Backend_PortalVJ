const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../../app');

chai.use(chaiHttp);
const expect = chai.expect;

describe('App Loading Test', function() {
  it('should load the Express app successfully', function() {
    expect(app).to.exist;
    expect(app).to.be.a('function'); // Express app is a function
  });

  it('should be able to make a basic request', function(done) {
    chai.request(app)
      .get('/api/test') // This might not exist, but we'll test the app structure
      .end((err, res) => {
        // We don't care about the response, just that the app can handle requests
        expect(err).to.be.null;
        done();
      });
  });
});
