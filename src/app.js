var c = document.getElementById("canvas");
var ctx = c.getContext("2d");
const BALL_RADIUS = 15;
const AIR_RESISTANCE = 0.010;
const ELASTICITY = -0.55;
const GRAVITY = 0.050;
var MUTATION_CHANCE = 0.05;
var generation = 1;
var basketWidth = 300;
var basketHeight = 100;

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    addVector(vector) {
        this.x += vector.x;
        this.y += vector.y;
    }
    
    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
    }

    limit(limitX, limitY) {
        if (this.x < limitX) {
            this.x = limitX;
        }
        if (this.y > limitY) {
            this.y = limitY;
        }
    }
}
class Point {
    constructor(position) {
        this.pos = position;
    }

    draw() {
        ctx.fillRect(this.pos.x, this.pos.y, 1, 1);
    }
}

class Line {
    constructor(startX, startY, endX, endY) {
        this.startingPoint = new Vector(startX, startY);
        this.endingPoint = new Vector(endX, endY);
    }
    
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.startingPoint.x, this.startingPoint.y);
        ctx.lineTo(this.endingPoint.x, this.endingPoint.y);
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    getMidPoint() {
        return Math.abs(this.startingPoint.x - this.endingPoint.x)/2 + Math.min(this.startingPoint.x, this.endingPoint.x);
    }
}

class Ball {
    constructor(velocity, force, position) {
        this.vel = velocity;
        this.force = force;
        this.pos = position;
        this.isDead = false;
        this.insideBasket = false;
        this.score = 0;
        this.velInitialX = velocity.x;
        this.velInitialY = velocity.y;
        this.vel.multiplyScalar(force);
        this.framesTaken = 0;
        this.isBest = false;
    }
    
    draw() {
        this.framesTaken++;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, BALL_RADIUS, 0, 2 * Math.PI);
        if (this.isBest) {
            ctx.fillStyle = "green";
            ctx.fill();
        }
        ctx.stroke();
        this.pos.addVector(this.vel);
        this.vel.y += GRAVITY;
        this.vel.x -=  AIR_RESISTANCE * (this.vel.x);
        this.checkCollision();
        this.checkDead();
    }

    checkCollision() {
        if (this.pos.y + BALL_RADIUS >= c.height && this.vel.y > 0) {
            this.vel.y *= ELASTICITY;
        }
        if (this.pos.y - BALL_RADIUS < 0 && this.vel.y < 0) {
            this.vel.y *= ELASTICITY;
        }
        if (this.pos.x + BALL_RADIUS >= c.width && this.vel.x > 0) {
            this.vel.x *= ELASTICITY;
        }
        if (this.pos.x - BALL_RADIUS < 0 && this.vel.x < 0) {
            this.vel.x *= ELASTICITY;
        }
    }

    checkBasketCollison(basket) {
        if (((this.vel.x > 0 && !this.insideBasket) || (this.insideBasket && this.vel.x < 0)) && this.pos.x + BALL_RADIUS > basket.leftWall.startingPoint.x && this.pos.x - BALL_RADIUS < basket.leftWall.startingPoint.x && this.pos.y + BALL_RADIUS > basket.leftWall.endingPoint.y) {
            this.vel.x *= ELASTICITY;
        }
        if (this.vel.x > 0 && this.pos.x + BALL_RADIUS > basket.rightWall.startingPoint.x && this.pos.x - BALL_RADIUS < basket.rightWall.startingPoint.x && this.pos.y + BALL_RADIUS > basket.rightWall.startingPoint.y) {
            this.vel.x *= ELASTICITY;
        }
        if (this.pos.x + BALL_RADIUS > basket.goalLine.startingPoint.x && this.pos.x - BALL_RADIUS < basket.goalLine.endingPoint.x && this.pos.y + BALL_RADIUS > basket.goalLine.startingPoint.y && this.pos.y - BALL_RADIUS < basket.goalLine.startingPoint.y) {
            this.insideBasket = true;
        }
    }

    checkDead() {
        if (Math.abs(this.vel.x) < 0.15 && Math.abs(this.vel.y) < 0.01) {
            this.isDead = true;
            this.vel.x = 0;
            this.vel.y = 0;
            this.calculateScore();
            if (!this.insideBasket) this.framesTaken = 1000000;
        }
    }

    calculateScore() {
        this.score = 1/(Math.abs(this.pos.x - (basket.goalLine.getMidPoint()) + 1) * 100);
        this.score += 1/(this.framesTaken/900);
    }
}

class Population {
    constructor(ballsToCreate) {
        this.balls = createRandomBalls(ballsToCreate);
        this.allScores = [];
        this.newBalls = [];
        this.scoresTotal = 0;
    }

    allBallsDead() {
        for (let i = 0; i < this.balls.length; i++) {
            if (!this.balls[i].isDead) {
                return false;
            }
        }
        return true;
    }

    generateNextGeneration() {
        generation++;
        this.calculateScores();
        
        this.allScores = [];
        this.scoresTotal = 0;
        this.balls.sort((a, b) => a.score - b.score);
        for (let i = 0; i < this.balls.length; i++) {
            this.allScores.push(this.balls[i].score);
            this.scoresTotal += this.balls[i].score;
        }

        this.newBalls = [];
        Loop1:
        for (let i = 0; i < this.balls.length - 1; i++) {
            let cumulative = 0;
            let rand = Math.random() * this.scoresTotal;
            let randV = Math.random() * 0.2 * (Math.random() < 0.5 ? -1 : 1);
            for (let j = 0; j < this.allScores.length; j++) {
                cumulative += this.allScores[j];
                if (rand < cumulative) {
                    let vector = new Vector(this.balls[j].velInitialX, this.balls[j].velInitialY);
                    vector.addVector(new Vector(randV, randV));
                    let force = this.balls[j].force;
                    let newBall = new Ball(vector, force, new Vector(10, c.height/1.1));
                    newBall.isDead = false;
                    this.mutateBall(newBall);
                    this.newBalls.push(newBall);
                    continue Loop1;
                }
            }
        }
        console.log(this.scoresTotal);
        let bestBall = this.balls[this.balls.length - 1];
        let vector = new Vector(bestBall.velInitialX, bestBall.velInitialY);
        let force = bestBall.force;
        let newBestBall = new Ball(vector, force, new Vector(10, c.height/1.1));
        newBestBall.isBest = true;
        this.newBalls.push(newBestBall);
        this.balls = this.newBalls;
    }

    calculateScores() {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].calculateScore();
        }
    }

    mutateBall(ball) {
        let rand = Math.random() * 1;

        if (rand < MUTATION_CHANCE) {
            ball.vel = new Vector(Math.random() * 15, Math.random() * -15);
            ball.velInitialX = ball.vel.x;
            ball.velInitialY = ball.vel.y;
            return;
        }
        if (rand < MUTATION_CHANCE) {
            ball.force = Math.random() * 2;
            return;
        }
    }
}

class Basket {
    constructor(width, height) {
        this.rightWall = new Line(c.width - 10, c.height - height, c.width - 10, c.height);
        this.base = new Line(this.rightWall.endingPoint.x, c.height - 2, this.rightWall.endingPoint.x - width, c.height - 2);
        this.leftWall = new Line(this.base.endingPoint.x, c.height, this.base.endingPoint.x, c.height - height);
        this.goalLine = new Line(this.leftWall.endingPoint.x + 25, this.leftWall.endingPoint.y, this.rightWall.startingPoint.x - 15, this.leftWall.endingPoint.y);
    }

    draw() {
        this.rightWall.draw();
        this.base.draw();
        this.leftWall.draw();
    }
}
let pop = new Population(200);
let basket = new Basket(basketWidth, basketHeight);
let points = [];
let interval = setInterval(draw, 10);

function createRandomBalls(numOfBalls) {
    let balls = [];
    let newBall;

    for (let i = 0; i < numOfBalls; i++) {
        newBall = new Ball(new Vector(Math.random() * 15, Math.random() * -15), Math.random() * 2, new Vector(10, c.height/1.1)); 
        balls.push(newBall);
    }
    return balls;
}

function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    
    ctx.font = "30px Arial";
    ctx.fillStyle = "black";
    ctx.fillText("Generation: " + generation, 10, 50);

    if (pop.allBallsDead()) {
        pop.generateNextGeneration();
    }
    for (let i = 0; i < pop.balls.length; i++) {
        pop.balls[i].draw();
        pop.balls[i].checkBasketCollison(basket);
    }
    basket.draw();
}

function update(element) {
    if (element.name == "bWidth") {
        basketWidth = element.value;
    }
    if (element.name == "bHeight") {
        basketHeight = element.value;
    }
    if (element.name == "mutate") {
        MUTATION_CHANCE = element.value/100;
    }
    
    basket = new Basket(basketWidth, basketHeight);
}