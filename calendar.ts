/**
 * @author Pogosyan G.A. gagikpog@gmail.com
 * @github https://github.com/gagikpog
 */

interface IGlobal {
    eventTemplate: string;
    receivedStates: string;
    userInfo: IUserInfo;
}

interface IUserInfo {
    identifier: string;
    name: string;
    image: string;
    client: number;
}

interface ISbisUserInfo {
    ИдентификаторСервисаПрофилей: string;
    ВыводимоеИмя: string;
    Фото: string;
    ИдентификаторКлиента: number;
}

interface IUserData {
    identifier: string;
    name: string;
    score: number;
}

interface IView {
    updateBoard(data: IUserData[]): void;
    setScrollPosition(value: number): void;
    updateScore(value: number): void;
    showMessage(): Promise<boolean>;
    getColumns(): HTMLDivElement[];
    destroy(): void;
}

interface IPlayer {
    x: number;
    y: number;
    size: number;
    outOfViewPort: boolean;
    destroy(): void;
    update(delta: number): void;
    jump(): void;
    getSize(): ICircle;
}

interface IService {
    update(score: number): Promise<void>;
    read(): Promise<IUserData[]>;
}

interface IPoint {
    x: number;
    y: number;
}

interface ICircle extends IPoint {
    r: number;
}

// @ts-ignore
window.game = (function(global: IGlobal) {
    enum State {
        Start = 'start',
        GameOver = 'game_over',
        Pause = 'pause',
        Running = 'running'
    }

    const DOOR_SIZE = 250;
    const TENSOR_CLIENT_ID = 3;
    const ACCELERATION = 0.001;
    const VELOCITY = 0.1;

    global.eventTemplate = global.eventTemplate || document.querySelector('.WTM-Days__DayGrid .WTM-Days-Event')?.outerHTML;
    const dayGridWidth = (document.querySelector('.WTM-Days__DayGrid')?.clientWidth || 0) + 22;
    const dayGridHeight = document.querySelector('.WTM-Days__DayGrid')?.clientHeight || 0;

    function getWallHeight() {
        return dayGridHeight * 0.45 + Math.floor(Math.random() * DOOR_SIZE * 0.8);
    }

    function getUserInfo(): IUserInfo {
        if (!global.userInfo) {
            const userInfo = JSON.parse(global.receivedStates).UserInfo as ISbisUserInfo;
            const identifier = userInfo.ИдентификаторСервисаПрофилей;
            const name = userInfo.ВыводимоеИмя;
            const image = userInfo.Фото;
            const client = userInfo.ИдентификаторКлиента;
            global.userInfo = { identifier, name, image, client };
        }

        return global.userInfo;
    }

    class View implements IView {
        private _scrollContainer: HTMLDivElement;
        private _scoreNode: HTMLSpanElement;
        private _boardNode: HTMLDivElement;
        private _menuRoot: HTMLDivElement;

        constructor() {
            this._scrollContainer = document.querySelector('.wtm-EndlessPanel__container-row.main .wtm-EndlessPanel__relative-point--hEndless');
            const { board, score, menuRoot } = this._getLeadBoardContainer();
            this._boardNode = board;
            this._scoreNode = score;
            this._menuRoot = menuRoot;
            this._insertStyles();
        }

        updateBoard(data: IUserData[]): void {
            const getNode = (text: string) => {
                const div = document.createElement('div');
                div.innerText = text;
                return div;
            }
            this._boardNode.innerHTML = '';
            this._boardNode.appendChild(getNode('№'));
            this._boardNode.appendChild(getNode('Игрок'));
            this._boardNode.appendChild(getNode('Очки'));

            data.forEach((item: IUserData, index: number) => {
                this._boardNode.appendChild(getNode(`${index + 1}`));
                this._boardNode.appendChild(getNode(item.name));
                this._boardNode.appendChild(getNode(`${item.score}`));
            });
        }

        setScrollPosition(value: number): void {
            if (this._scrollContainer) {
                this._scrollContainer.style.left = `-${value}px`;
            }
        }

        updateScore(value: number): void {
            this._scoreNode.textContent = `${value}`;
        }

        showMessage(): Promise<boolean> {
            // @ts-ignore
            return require('Controls/popup').Confirmation.openPopup({ message: 'Вы проиграли, хотите еще?' });
        }

        getColumns(): HTMLDivElement[] {
            const count = document.querySelector('.WTM-Days__DayWrapper')?.querySelectorAll('.WTM-Days__DayGrid').length || 0;
            // @ts-ignore
            return [...document.querySelectorAll('.WTM-Days__DayGrid')].slice(count, count * 2 + 1);
        }

        destroy(): void {
            this._scrollContainer = null;
            this._scoreNode.remove();
            this._boardNode.remove();
            this._menuRoot.remove();
            this._scoreNode = null;
            this._boardNode = null;
            this._menuRoot = null;
            document.querySelector('#game-styles')?.remove();
        }

        private _getLeadBoardContainer() {
            const mainLayout = document.querySelector('.sabyPage-MainLayout__workspace');

            const scoreNode = document.createElement('span');
            scoreNode.classList.add('controls-fontweight-bold', 'controls-margin_left-2xs');

            const title = document.createElement('span');
            title.innerText = 'Очки: ';

            const right = document.createElement('div');
            right.style.marginLeft = 'auto';

            const link = document.createElement('a');
            link.href = 'https://gagikpog.ru/leadboard';
            link.innerText = 'Топ 100';
            link.target = '__blink';
            right.appendChild(link);

            const header = document.createElement('div');
            header.classList.add('controls-padding-m', 'controls-background-contrast', 'controls-fontsize-2xl', 'tw-flex');
            header.appendChild(title);
            header.appendChild(scoreNode);
            header.appendChild(right);

            const menuRoot = document.createElement('div');
            menuRoot.style.position = 'absolute';
            menuRoot.style.top = '-44px';
            menuRoot.style.right = '0';
            menuRoot.style.zIndex = '10000';
            menuRoot.style.width = '300px';
            menuRoot.style.backgroundColor = '#fff';
            menuRoot.style.borderBottomLeftRadius = '8px';
            menuRoot.style.boxShadow = '-1px 1px 10px 0px #00000070';
            mainLayout?.appendChild(menuRoot);

            const board = document.createElement('div');
            board.classList.add('lead-board-items-container', 'tw-grid', 'controls-padding-m');
            board.style.gridTemplateColumns = 'min-content 1fr min-content';
            board.style.gap = '10px';
            menuRoot.appendChild(header);
            menuRoot.appendChild(board);

            return { board, score: scoreNode, menuRoot };
        }

        private _insertStyles(): void {
            const style = '<style id="game-styles">' +
            '.WTM-Days__DayGrid_WorkScheduleItem,' +
            '.WTM-Days__DayGrid .WTM-Days-Event,' +
            '.WTM-Days__TimeIndicator-line,' +
            '.WTM-Days__GridMarker {display: none!important;}' +
            '.WTM-Days__DayGrid .lead-board-wall-container .WTM-Days-Event {display: block!important;}' +
            '.WTM-Days__DayGrid_type-holiday{background-color:transparent;}' +
            '</style>';
            document.head.insertAdjacentHTML('beforeend', style);
        }
    }

    class Game {
        private _state: State = State.Start;
        private _previousTimeStamp: number;
        private _animationId: number;
        private _player: IPlayer;
        // @ts-ignore
        private _walls = [];
        private _position: number = 0;
        private _score: number = 0;
        private _view: IView;
        private _service: IService;

        constructor() {
            this._view = new View();
            document.addEventListener('keydown', this._keyDown);
            this._view.getColumns().forEach((col) => {
                this._walls.push(new DoubleWall({container: col, h: getWallHeight()}));
            });
            this.newGame();
            this._service = new Service(getUserInfo());
            this._service.read().then((data: IUserData[]) => this._view.updateBoard(data));
        }
        
        run(): void {
            this._state = State.Running;
            this._previousTimeStamp = 0;
            this._animationId = requestAnimationFrame(this._loop);
        }

        stop(state = State.Pause): void {
            this._state = state;
            cancelAnimationFrame(this._animationId);
        }

        newGame(): void {
            this._state = State.Start;
            this._position = 0;
            this._score = -1;
            this._player?.destroy();
            this._player = new Player();
            [0, 1].forEach((i) => {
                this._walls[i].update({h: 0});
            });
            this._view.updateScore(0);
            this._update(0)
        }
        
        destroy(): void {
            this.stop();
            this._view.destroy();
            this._view = null;
            this._player.destroy();
            this._player = null;
            this._walls.forEach((wall) => wall.destroy());
            this._walls = [];
            document.removeEventListener('keydown', this._keyDown);
        }

        private _loop = (timeStamp: number): void => {
            if (this._state !== State.Running) {
                return;
            }

            if (this._previousTimeStamp) {
                const mexDelta = 50;
                this._update(Math.min(mexDelta, timeStamp - this._previousTimeStamp));
                this._collide()
            }

            this._previousTimeStamp = timeStamp;
            this._animationId = requestAnimationFrame(this._loop);
        }

        private _update(delta: number): void {
            this._player.update(delta);

            if (this._position > dayGridWidth) {
                this._position = this._position % dayGridWidth;
                this._addNewWall();
                this._score++;
                this._view.updateScore(this._score < 0 ? 0 : this._score);
            }

            this._position += delta * (VELOCITY + this._score * ACCELERATION);

            this._view.setScrollPosition(this._position);
        }

        private _collide(): void {
            if (this._player.outOfViewPort) {
                this._gameOver();
            }

            const circle: ICircle = this._player.getSize();

            const collided = [0, 1].some((index) => {
                return this._walls[index].collide(circle);
            });

            if (collided) {
                this._gameOver();
            }
        }

        private _gameOver(): void {
            this._service.update(this._score).then(() => this._service.read()).then((data) => this._view.updateBoard(data));
            this.stop(State.GameOver);
            this._view.showMessage().then((restart: boolean) => {
                if (restart) {
                    this.newGame();
                } else {
                    this.destroy();
                }
            })
        }

        private _addNewWall(): void {
            let i = 0;
            for (i = 0; i < this._walls.length - 1; i++) {
                const nextHeight = this._walls[i + 1].h;
                this._walls[i].update({ h: nextHeight });
            }
            this._walls[i].update({ h: getWallHeight() });
        }

        private _keyDown = (event: KeyboardEvent): void => {
            switch(event.code) {
                case 'Space':
                    if (this._state === State.Running) {
                        this._player.jump();
                    }
                    if (this._state === State.Start) {
                        this.run();
                    }
                    break;
                case 'KeyP':
                    if (this._state === State.Running) {
                        this.stop();
                    } else if (this._state === State.Pause) {
                        this.run();
                    }
                    break;
                default:
                    break;
            }
        }
    }

    class Service implements IService {
        private _hostPath: string = 'https://gagikpog.ru/leadboard/';
        private _identifier: string;
        private _name: string;
        private _image: string;
        private _client: number;

        constructor(user: IUserInfo) {
            this._identifier = user.identifier;
            this._name = user.name;
            this._image = user.image;
            this._client = user.client;
        }

        update(score: number): Promise<void> {
            if (score <= 0 || this._client !== TENSOR_CLIENT_ID) {
                return Promise.resolve();
            }

            return fetch(`${this._hostPath}add.php`, {
                method: 'POST',
                body: JSON.stringify({
                    identifier: this._identifier,
                    game: 'calendar',
                    score,
                    meta: JSON.stringify({image: this._image, name: this._name})
                })
            }).then((res) => {
                return res.json();
            }).catch((err) => {
                console.error(err);
            });
        }

        read(): Promise<IUserData[]> {
            return fetch(`${this._hostPath}getTop.php`, {
                method: 'POST',
                body: JSON.stringify({
                    game: 'calendar',
                    limit: 10
                })
            }).then((res) => {
                return res.json();
            }).then((res) => {
                if (res.status === 'done') {
                    // @ts-ignore
                    return res.data.map((item): IUserData => {
                        let meta = {};
                        try {
                            meta = JSON.parse(item.meta);
                        } catch (error) {}
                        // @ts-ignore
                        return {
                            identifier: item.identifier,
                            score: item.score,
                            ...meta
                        };
                    })
                }
                return [];
            }).catch(() => {
                return [];
            })
        }
    }

    class Player implements IPlayer {
        x: number = 60;
        y: number = 0;
        size: number = 50;
        outOfViewPort: boolean = false;

        private _vy: number = 1;
        private _maxVy = 20;
        private _player;

        constructor() {
            // @ts-ignore
            this._player = new PlayerView({size: this.size});
            // @ts-ignore
            this.y = this._player.maxY() / 2;
            // @ts-ignore
            this._player.setPosition({x: this.x, y: this.y});
        }

        destroy(): void {
            // @ts-ignore
            this._player.destroy();
            // @ts-ignore
            this._player = null;
        }

        update(delta: number): void {
            // @ts-ignore
            const max = this._player.maxY();
            const min = 0;

            this.y += delta * 0.02 * this._vy;
            this._vy = Math.max(-this._maxVy, Math.min(this._vy + delta * 0.1, this._maxVy));

            if (this.y > max) {
                this.y = max;
                this.outOfViewPort = true;
            } else if (this.y < min) {
                this.y = min;
            }

            // @ts-ignore
            this._player.setPosition({x: this.x, y: this.y});
        }

        jump(): void {
            if (this.y > 50) {
                this._vy = -this._maxVy;
            }
        }

        getSize(): ICircle {
            // @ts-ignore
            return this._player.getSize();
        }
    }

    class PlayerView {
        private _img: HTMLImageElement;
        private _container: HTMLDivElement;
        private _size: number;
        // @ts-ignore
        constructor({size}) {
            this._size = size;
            const image = getUserInfo().image;
            this._img = document.createElement('img');
            this._img.style.position = 'absolute';
            this._img.style.zIndex = '1000';
            this._img.style.borderRadius = '50%';
            this._img.style.width = `${this._size}px`;

            this._img.src = `/previewer/288/fs-public/person_avatar_files/${image}`;
            this._container = document.querySelector('.wtm-EndlessPanel__glass-container');
            if (!this._container) {
                throw new Error('Unknown player container');
            }

            this._container.appendChild(this._img);
        }

        maxY(): number {
            return this._container.clientHeight - this._size;
        }

        destroy(): void {
            this._img.remove();
            this._img = null;
        }

        setPosition({x, y}: IPoint): void {
            this._img.style.left = `${x}px`;
            this._img.style.top = `${y}px`;
        }

        getSize(): ICircle {
            const rect = this._img.getBoundingClientRect();
            const r = rect.width / 2;
            return { x: rect.x + r, y: rect.y + r, r };
        }
    }

    class DoubleWall {
        h: number;
        private _top;
        private _bottom;
        // @ts-ignore
        constructor({container, h}) {
            this.h = h;
            this._top = new WallView({ container, y: 0, h });
            this._bottom = new WallView({ container, y: h + DOOR_SIZE, h } );
        }

        destroy(): void {
            this._top.destroy();
            this._bottom.destroy();
        }
        // @ts-ignore
        update({ h }): void {
            this.h = h;
            this._top.update({ y: 0, h });
            this._bottom.update({ y: h + DOOR_SIZE, h });
        }

        collide(circle: ICircle): boolean {
            return this._top.collide(circle) || this._bottom.collide(circle);
        }
    }

    class WallView {
        h: number;
        y: number;

        private _node: HTMLDivElement;
        private _children: HTMLDivElement;

        // @ts-ignore
        constructor({ container, y, h }) {
            this.y = y;
            this.h = h;
            this._node = document.createElement('div');
            container.appendChild(this._node);
            this._node.innerHTML = global.eventTemplate;
            this._node.classList.add('tw-contents', 'lead-board-wall-container');
            this._children = this._node.children[0] as HTMLDivElement;
            this._children.style.width = `${40}%`;

            this.update({ y, h });
        }

        // @ts-ignore
        update({ y, h }): void {
            this.y = y;
            this.h = h;
            this._children.style.top = `${y}px`;
            this._children.style.height = `${h}px`;
        }
        
        destroy(): void {
            this._node.remove();
            this._node = null;
            this._children = null;
        }

        collide(circle: ICircle): boolean {
            const rect = this._children.getBoundingClientRect();

            const x = Math.max(rect.left, Math.min(circle.x, rect.right));
            const y = Math.max(rect.top, Math.min(circle.y, rect.bottom));
            const distanceSquare = (x - circle.x) ** 2 + (y - circle.y) ** 2;
            return distanceSquare < circle.r ** 2;
        }
    }

    return new Game();
})(window as unknown as IGlobal);
