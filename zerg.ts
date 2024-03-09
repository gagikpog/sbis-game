"use strict";
const INVISIBLE_CLASS_NAME = 'zerg-rush-invisible';
const NODE_CLASS_NAME = 'zerg-rush-node';
const CANVAS_CLASS_NAME = 'zerg-rush-canvas';
const ZERG_COUNT = 25;
const ZERG_ATTACK_INTERVAL = 200;
const ZERG_SPEED = 0.2;

function isValidNode(node) {
    const name = node.nodeName;
    return name === 'DIV' ||
        name === 'SPAN' ||
        name === 'BUTTON' ||
        name === 'A' ||
        name === 'HEADER' ||
        name === 'MAIN' ||
        name === 'IMG' ||
        name === 'BODY' ||
        name === 'SELECT' ||
        name === 'svg' ||
        name === 'NAV';
}

function isElementInViewport(node) {
    const rect = node.getBoundingClientRect();
    return rect.bottom > 0 &&
        rect.right > 0 &&
        rect.left < window.innerWidth &&
        rect.top < window.innerHeight;
}

function isVisible(node) {
    if (node.nodeName === 'BUTTON' || node.nodeName === 'IMG' || node.nodeName === 'svg') {
        return true;
    }
    if (node.nodeName === 'BODY') {
        return false;
    }
    const styles = window.getComputedStyle(node);
    return styles.borderWidth !== '0px' ||
        styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        styles.backgroundImage !== 'none';
}

function insertStyles() {
    const style = '<style id="zerg-rush-styles">' +
        `.${INVISIBLE_CLASS_NAME}{visibility:hidden;transform: rotate(45deg) scale(0.5);opacity: 0;transition: all 1s;}` +
        `.${CANVAS_CLASS_NAME}{position:fixed;top:0;left:0;z-index:9999}` +
        `.${NODE_CLASS_NAME}::before{content:"";position:fixed;height:3px;background-color:red;width:var(--zr-node-width);top:var(--zr-node-top);}` +
    '</style>';
    document.head.insertAdjacentHTML('beforeend', style);
}

const nodesList = [];

class Node {
    rect;
    zergCount = 0;
    _rootNode;
    _childrens = [];
    _hidden;
    _broken = false;
    _maxScore = 10;
    _score;

    constructor(rootNode) {
        this._rootNode = rootNode;

        if (Game.DEBUG) {
            this._rootNode.vnode = this;    
        }

        rootNode.childNodes.forEach((node) => {
            if (isValidNode(node)) {
                this._childrens.push(new Node(node));
            } else {
               Game.log('invalid node', node)
            }
        });

        this._hidden = !isElementInViewport(rootNode) || !(isVisible(rootNode) || this._hasChildrenTextContent());
        this._score = this._hidden ? 0 : this._maxScore;

        if (!this._hidden) {
            nodesList.push(this);
            this.rect = rootNode.getBoundingClientRect();
            this._rootNode.style.setProperty('--zr-node-top', `${this.rect.top - 5}px`);
            this._rootNode.classList.add(NODE_CLASS_NAME);
        }
    }

    hit() {
        this._score--;
        const maxWidth = 50;
        this._rootNode.style.setProperty('--zr-node-width', `${maxWidth * this._score / this._maxScore}px`);
        if (this._score <= 0) {
            this.break();
        }
    }

    break() {
        if (this._broken) {
            return;
        }
        this._hidden = true;
        this._broken = true;
        this._rootNode.classList.add(INVISIBLE_CLASS_NAME);
    }

    isBroken() {
        return this._broken || this._hidden && this._childrens.every((node) => node.isBroken());
    }

    canBreak() {
        return this._broken ? false : this._childrens.every((node) => node.isBroken());
    }

    _hasChildrenTextContent() {
        return this._childrens.length === 0 && !!this._rootNode.textContent;
    }
}

class Game {

    _root;
    _view;
    _zergs = [];
    _previousTimeStamp;
    _animationId;

    constructor(node) {
        insertStyles();
        this._root = new Node(node);
        this._view = new View();
        for (let i = 0; i < ZERG_COUNT; i++) {
            this._zergs.push(new Zerg());
        }
        this._view.canvas.addEventListener('click', this._clickHandler)
        this.run();
    }

    run() {
        this._animationId = requestAnimationFrame(this._loop);
    }

    _loop = (timeStamp) => {
        if (this._previousTimeStamp) {
            const mexDelta = 50;
            this._update(Math.min(mexDelta, timeStamp - this._previousTimeStamp));
        }

        this._previousTimeStamp = timeStamp;
        this._animationId = requestAnimationFrame(this._loop);
    }

    _update(timeStamp) {
        this._view.draw({ zergs: this._zergs });
        this._zergs.forEach((zerg) => {
            zerg.update(timeStamp);
            if (zerg.die) {
                zerg.toAlive();
            }

            if (!zerg.node) {
                const node = this._getNode({x: zerg.x, y: zerg.y});
                if (node) {
                    zerg.attack(node);
                }
            }
        });
    }

    _clickHandler = (event) => {
        event.x;
        event.y;
        const size = 25;
        for (let i = 0; i < this._zergs.length; i++) {
            const zerg = this._zergs[i];
            if (zerg.x < event.x && zerg.x + size > event.x && zerg.y - size < event.y && zerg.y > event.y) {
                zerg.hit();
                return;
            }
        }
    }

    _getNode(pos) {
        let res = null;
        let len = Infinity;
        nodesList.forEach((node) => {
            if (node.canBreak()) {
                const rect = node.rect;
                const x = Math.max(rect.left, Math.min(pos.x, rect.right));
                const y = Math.max(rect.top, Math.min(pos.y, rect.bottom));

                const distanceSquare = (x - pos.x) ** 2 + (y - pos.y) ** 2;
                if (len > distanceSquare * (node.zergCount * 4 + 1)) {
                    len = distanceSquare;
                    res = node;
                }
            }
        });
        return res;
    }

    static DEBUG = false;

    static log(...args) {
        if (Game.DEBUG) {
            console.log(...args);
        }
    }
}

class View {

    canvas;
    _ctx;

    constructor() {
        this._create();
    }

    draw({ zergs }) {
        this._ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        zergs.forEach((zerg) => {
            zerg.draw(this._ctx);
        });
    }

    _create() {
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        this._ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.classList.add(CANVAS_CLASS_NAME);
    }
}

class Zerg {
    die;
    x;
    y;
    _maxScore = 50;
    _score;
    _walkPoint;
    _timeStep = 0;
    node;

    constructor() {
        this.toAlive();
    }

    draw(ctx) {
        if (!this.die) {
            if (this._score !== this._maxScore) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ff0000';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 25);
                ctx.lineTo(this.x + 20 * this._score / this._maxScore, this.y - 25);
                ctx.closePath();
                ctx.stroke();
            }
            const size = Math.trunc(this._timeStep / 200);
            ctx.font = `bold ${25 + size}px serif`;
            ctx.fillStyle = '#00ff00';
            
            ctx.fillText('O', this.x - size / 2, this.y - size / 2);
        }
    }

    toAlive() {
        const rand = Math.random();
        if (rand < 0.33) {
            // left
            this.x = 0;
            this.y = Math.random() * window.innerHeight;
        } else if (rand < 0.66) {
            // top
            this.x = Math.random() * window.innerWidth;
            this.y = 0;
        } else {
            // right
            this.x = window.innerWidth;
            this.y = Math.random() * window.innerHeight;
        }
        
        this.die = false;
        this._score = this._maxScore;
        this._walkPoint = { x: this.x, y: this.y };
    }

    hit() {
        this._score -= 10;
        if (this._score <= 0) {
            this.die = true;
            this.node = null;
        }
    }

    attack(node) {
        this.node = node;
        node.zergCount++;
        const rect = node.rect;

        const x = Math.max(rect.left, Math.min(this.x, rect.right));
        const y = Math.max(rect.top, Math.min(this.y, rect.bottom));

        this._walkPoint = { x, y };
    }

    update(timeStamp) {
        if (!this.die && this.node) {
            if (this._inPosition()) {
                this._attack(timeStamp);
            } else if (this.node.isBroken()) {
                this.node = null;
            } else {
                this._walkToPoint(timeStamp);
            }
        }
    }

    _attack(timeStamp) {
        if (this._timeStep > ZERG_ATTACK_INTERVAL) {
            this._timeStep -= ZERG_ATTACK_INTERVAL;
            this.node.hit();
            if (this.node.isBroken()) {
                this.node = null;
            }
        }
        this._timeStep += timeStamp;
    }

    _walkToPoint(timeStamp) {
        const length = Math.sqrt((this._walkPoint.x - this.x) ** 2 + (this._walkPoint.y - this.y) ** 2);
        if (length > 5) {
            this.x += timeStamp * ZERG_SPEED * (this._walkPoint.x - this.x) / length;
            this.y += timeStamp * ZERG_SPEED * (this._walkPoint.y - this.y) / length;
        } else {
            this.x = this._walkPoint.x;
            this.y = this._walkPoint.y;
        }
    }

    _inPosition() {
        return this._walkPoint.x === this.x && this._walkPoint.y === this.y;
    }
}

const game = new Game(document.body);
