const expect = require("expect");
const supertest = require("supertest");
const { ObjectID } = require("mongodb");
const { app } = require("../server.js");
const { CourtCase } = require("../models/courtCase");
const { User } = require("../models/user");
const jwt = require("jsonwebtoken");

const { cases, users, populate, populateUsers } = require("./seed/seed");

// Reset database for tests
beforeEach(populate);
beforeEach(populateUsers);

describe("POST /cases", () => {
    it("Should POST a new courtCase", (done) => {
        supertest(app)
            .post("/cases")
            .send(cases[1])
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBeA('number');
                expect(res.body.date_created).toBeA('string')
                expect(res.body.date_modified).toBeA('string')
                expect(res.body.resource_uri).toBeA('string')
                expect(res.body.case_name).toBeA('string')
            })
            .end(done);
    });

    it("Should not POST courtCase with invalid body data", (done) => {
        supertest(app)
            .post("/cases")
            .send({})
            .expect(400)
            .end((err,res) => {
                if(err){
                    return done(err);
                }

                CourtCase.find().then((cases) => {
                    expect(cases.length).toBe(1);
                    done();
                }).catch((e) => {
                    done(e);
                });
            });
    });

    it("Should not POST a duplicate courtCase", (done) => {
        supertest(app)
            .post("/cases")
            .send(cases[0])
            .expect(400)
            .end((err,res) => {
                if(err){
                    return done(err);
                }

                CourtCase.find().then((cases) => {
                    expect(cases.length).toBe(1);
                    done();
                }).catch((e) => {
                    done(e);
                });
            });
    });
});

describe("GET /cases", () => {
    it("Should GET all cases", (done) => {
        supertest(app)
            .get("/cases")
            .expect(200)
            .expect((res) => {
                expect(res.body.cases.length).toBe(1);
            })
            .end(done);
    });

    it("Should not GET a non-existent court case", (done) => {
        const fakeID = new ObjectID();
        supertest(app)
            .get(`/cases/${fakeID.toHexString()}`)
            .expect(404)
            .end(done)
    });

    it("Should GET a single case", (done) => {
        supertest(app)
            .get(`/cases/${cases[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.the_case.id).toBe(cases[0].id);
                expect(res.body.the_case.absolute_url).toBe(cases[0].absolute_url);
                expect(res.body.the_case.date_created).toBe(cases[0].date_created);
                expect(res.body.the_case.date_modified).toBe(cases[0].date_modified);
                expect(res.body.the_case.resource_uri).toBe(cases[0].resource_uri);
                expect(res.body.the_case.case_name).toBe(cases[0].case_name);
            })
            .end(done);
    });
});

describe("DELETE /cases", () => {
    it("Should delete a single case", (done) => {
        supertest(app)
            .delete(`/cases/${cases[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.the_case.id).toBe(cases[0].id);
                expect(res.body.the_case.absolute_url).toBe(cases[0].absolute_url);
                expect(res.body.the_case.date_created).toBe(cases[0].date_created);
                expect(res.body.the_case.date_modified).toBe(cases[0].date_modified);
                expect(res.body.the_case.resource_uri).toBe(cases[0].resource_uri);
                expect(res.body.the_case.case_name).toBe(cases[0].case_name);
            })
            .end(done);
    });

    it("Should not delete a non-existent court case", (done) => {
        const fakeID = new ObjectID();
        supertest(app)
            .delete(`/cases/${fakeID.toHexString()}`)
            .expect(404)
            .end(done)
    });
});

describe("POST /users", () => {
    it("Should post a new user", (done) => {
        var email = "uniqueemail@example.com"
        var password = "9webipasd"
        supertest(app)
            .post("/users") // Post request to the /todos URL
            .send({
                email,
                password
            })
            .expect(200)
            .expect((res) => {
                expect(res.headers).toIncludeKey('x-auth')
                expect(res.body._id).toExist();
                expect(res.body.email).toBe(email);
            })
            .end((err) => {
                if(err){
                    return done(err);
                }
                User.findOne({email}).then((user) => {
                    expect(user).toExist();
                    expect(user.password).toNotBe(password);
                    done();
                }).catch((e) => done(e));
            });
    });
    it("Should not post a duplicate email", (done) => {
        supertest(app)
            .post("/users")
            .send({
                email: users[0].email,
                password: "sidhf89we"
            }) // Try to post old email
            .expect(400)
            .end(done)
    });
    it("Should return validation errors", (done) => {
        var email = "notvalid";
        var password = "";
        supertest(app)
            .post("/users")
            .send({
                email: email,
                password: password
            })
            .expect(400) // Doesn't send anything back becuase our User model breaks it. Catch block of our "/users" route.
            .end(done);
    });
});

describe("POST /users/me", () => {
    it("Should return current user if authenticated", (done) => {
        supertest(app)
            .get("/users/me")
            .set("x-auth", users[0].tokens[0].token) // Pass in token.
            .expect(200)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString());
                expect(res.body.email).toBe(users[0].email);
            })
            .end(done);
    });
    it("Should return 401 error if not authenticated", (done) => {
        supertest(app)
            .get("/users/me") // No token! Our authenticate route will fail
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({});
            })
            .end(done);

    });
});

describe("POST /users/login", () => { // This will return a token to the user.
    it("Should login a user with the valid email and password", (done) => {
        supertest(app)
            .post("/users/login")
            .send({
                email: users[1].email, // Pass in login credentials of someone w/out token
                password: users[1].password
            })
            .expect(200)
            .expect((res) => {
                expect(res.headers["x-auth"]).toExist();
            })
            .end((err,res) => {
                if(err){
                    return done(err);
                }
                User.findById(users[1]._id).then((user) => {
                    expect(user.tokens[0]).toInclude({
                        access: "auth",
                        token: res.headers["x-auth"]
                    });
                    done();
                }).catch((e) => done(e));
            });
    });
});