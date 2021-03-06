import Phaser from 'phaser';
import State from '../GameState';
import Player from '../Player';
import ScrollObject from '../ScrollObject';
import Pipe from '../Pipe';
import PipeManager from '../PipeManager';
import ScoreRenderer from '../ScoreRenderer';
import UI from '../UI';

let state = new State();

//config
const foregroundScrollSpeed = -2;
const BGscrollSpeed = 0; //turned this off because it was flickering and it was kinda annoying 
const playerXpos = 100;

//Objects
let bg;
let ground;
let player;
let pipeMan;
let scoreText;
let ui;

let updateOnMove = []; //list of objects that need .update called on move

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    Pipe.preload(this);
    Player.preload(this);
    ScrollObject.preload(this);
    ScoreRenderer.preload(this);
    UI.preload(this);
  }

  create() {
    //background texture scroll
    bg = new ScrollObject(this, 0, 690, 800, 600, 'bg', BGscrollSpeed).setOrigin(0, 1);
    updateOnMove.push(bg);

    //Setup Player
    player = new Player(this, playerXpos, this.cameras.main.height / 4, 'norby', 'norby_dead', Phaser.Input.Keyboard.KeyCodes.UP);
    player.StartScreenBob();
    player.OnGameStart(() => this.StartGame());
    player.OnGameOver(() => this.EndGame()); //has to be an anon method so that the 'this' keyword refers to the scene

    //Setup Pipes + collisions against player
    pipeMan = new PipeManager(this, 10, foregroundScrollSpeed);
    pipeMan.pipes.map((pipe) => player.collideAgainst(pipe));
    this.physics.add.overlap(player, pipeMan.scoreZones, this.AddScore, null, this); //scoring
    updateOnMove.push(pipeMan);

    //Ground
    ground = new ScrollObject(this, 0, 650, 800, 100, 'ground', foregroundScrollSpeed).setOrigin(0, 1);
    this.physics.add.existing(ground, true); //enable physics on ground
    player.collideAgainst(ground);
    updateOnMove.push(ground);

    //Score text
    scoreText = new ScoreRenderer(this, 4);

    ui = new UI(this);

    //Register any key press for triggering reset after game over 
    //(not really ideal since it fires on every key press)
    this.input.keyboard.on('keyup', (event) => {
      if (state.current.gameOver) {
        this.Reset();
      }
    })
  }

  //Update updatables like scrolling items and the pipe manager
  //(most objects call their own update through a scene event)
  update() {
    if (state.current.moving) {
      updateOnMove.map((object) => object.update());
    }
  }

  //Called when player overlaps with score zone
  AddScore(player, zone) {
    if (!player.alive) return; //todo make funcitno
    scoreText.SetScore(++state.current.score);
    zone.x = -99;
    zone.disableBody(true, true);
    this.sound.play('point');
  }

  StartGame() {
    state.current.moving = true;
    pipeMan.Start();
    scoreText.DrawScore(0, this.cameras.main.width / 2, 50);
    ui.RemoveTitleSprites();
  }

  //Triggered by player ending the game
  EndGame() {
    state.current.gameOver = true;
    state.current.moving = false;
    pipeMan.Stop();
    ui.ShowGameOver();

    //Set highscore
    const best = localStorage.getItem('best');
    if (state.current.score > best)
      localStorage.setItem('best', state.current.score);
  }

  //called when any key is pressed after game over
  //there's probably some phaser way of doing this but I bet this is way faster
  Reset() {
    ui.Reset();

    pipeMan.Reset();
    state.Reset();
    scoreText.SetScore(0);

    player.Reset();
    player.StartScreenBob();

    //reset tiled bg
    bg.tilePositionX = 0;
    ground.tilePositionX = 0;
  }
}