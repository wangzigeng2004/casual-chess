import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/firestore';
import { TranslateService } from '@ngx-translate/core';
import { Game, UtilsService, ConfigurationService, Configuration, Player } from '../shared';
import { map } from 'rxjs/operators';
import { combineLatest, Observable, Subscription } from 'rxjs';

import * as Chess from 'chess.js';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  private subscriptions: Subscription[] = [];

  public configuration: Configuration;

  public game = null;
  public gameCreated = false;
  public playerKey: string;
  public games: Game[];

  public texts: any;

  constructor(
    private toast: ToastController,
    public translate: TranslateService,
    private afs: AngularFirestore,
    public alertController: AlertController,
    private configurationService: ConfigurationService,
    private utils: UtilsService
  ) { }

  ngOnInit() {
    this.subscriptions.push(this.translate.get([
      'home.link-copied',
      'home.delete-dialog.title',
      'home.delete-dialog.subtitle',
      'home.delete-dialog.message',
      'home.delete-dialog.cancel',
      'home.delete-dialog.continue'
    ]).subscribe(async res => {
      this.texts = res;
    }));
    this.configurationService.initialize().then(config => {
      this.configuration = config;
      this.loadMyGames();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions = [];
  }

  loadMyGames() {
    const chess = new Chess();
    this.subscriptions.push(
      this.afs.collection<Player>('players', ref => {
        return ref.where('pid', '==', this.configuration.pid)
      })
        .valueChanges()
        .subscribe(players => {
          if (players != null && players.length > 0) {
            // players.forEach(player => {

            // });

            // this.afs.collection<Game>('games', ref => {
            //   return ref.where('wpkey', '==', players[0].uid)
            // })
            //   .snapshotChanges()
            //   .subscribe(gdata => {
            //     this.games = gdata.map(gitem => {
            //       return gitem.payload.doc.data();
            //     });
            //   });
            this.playerKey = players[0].uid;
            const gamelist: Observable<Game[]>[] = [];
            const gamesAsWhitePlayer = this.afs.collection<Game>('games', ref => {
              return ref
                .where('wpkey', '==', players[0].uid)
                .where('wdeleted', '==', false)
            }).valueChanges();
            gamelist.push(gamesAsWhitePlayer);
            const gamesAsBlackPlayer = this.afs.collection<Game>('games', ref => {
              return ref
                .where('bpkey', '==', players[0].uid)
                .where('bdeleted', '==', false)
            }).valueChanges();
            gamelist.push(gamesAsBlackPlayer);
            if (players[0].hasOwnProperty('stars')) {
              players[0].stars.forEach(vid => {
                gamelist.push(this.afs.collection<Game>('games', ref => {
                  return ref
                    .where('vid', '==', vid)
                }).valueChanges());
              });
            }
            this.subscriptions.push(
              combineLatest(gamelist)
                .pipe(
                  map(arr => arr
                    .reduce((acc, cur) => acc.concat(cur))
                    .sort((gameA, gameB) => {
                      if (gameA.timestamp < gameB.timestamp)
                        return 1;
                      else if (gameA.timestamp > gameB.timestamp)
                        return -1;
                      else
                        return 0;
                    })
                  )
                ).subscribe(games => {
                  this.games = games;
                  this.games.forEach(game => {
                    //if (!game.gameover) {
                    chess.load_pgn(game.pgn);
                    game.turn = chess.turn();
                    game.checkmated = chess.in_checkmate();
                    //}
                  });
                }));
          };
        }));
  }

  newGame() {
    this.game = {
      timestamp: new Date(),
      uid: null,
      vid: `v${this.utils.uuidv4()}`,
      wid: `w${this.utils.uuidv4()}`,
      bid: `b${this.utils.uuidv4()}`,
      wpkey: null,
      bpkey: null,
      wpname: null,
      bpname: null,
      pgn: '',
      gameover: false,
      wdeleted: false,
      bdeleted: false
    };
    this.afs.collection<Game>('games').add(this.game).then(result => {
      this.game.uid = result.id;
      this.afs.collection<Game>('games').doc(result.id).update(this.game).then(() => {
        this.gameCreated = true;
      });
    });
  }

  private async showToastClipboard() {
    const toast = await this.toast.create({
      message: this.texts['home.link-copied'],
      position: 'middle',
      color: 'success',
      duration: 1000
    });
    toast.present();
  }

  copyToClipboard(content: string) {
    const el = document.createElement('textarea');
    el.value = content;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.showToastClipboard();
  }

  copyWhiteLink() {
    this.copyToClipboard(`https://casual-chess.web.app/position/${this.game.wid}`);
  }

  copyBlackLink() {
    this.copyToClipboard(`https://casual-chess.web.app/position/${this.game.bid}`);
  }

  copyViewerLink() {
    this.copyToClipboard(`https://casual-chess.web.app/position/${this.game.vid}`);
  }

  async delete(game) {
    const alert = await this.alertController.create({
      header: this.texts['home.delete-dialog.title'],
      subHeader: this.texts['home.delete-dialog.subtitle'],
      message: this.texts['home.delete-dialog.message'],
      buttons: [
        {
          text: this.texts['home.delete-dialog.cancel'],
          role: 'cancel',
          cssClass: 'overlay-button',
          handler: () => {
          }
        }, {
          text: this.texts['home.delete-dialog.continue'],
          cssClass: 'overlay-button',
          handler: () => {

            if (game.wpkey == this.playerKey) {
              game.wdeleted = true;
            } else {
              game.bdeleted = true;
            }
            this.afs.collection<Game>('games').doc(game.uid).update(game).then();
          }
        }
      ]
    });
    await alert.present();
  }

  removeStar(game: Game) {
    this.subscriptions.push(
      this.afs.collection<Player>('players', ref => {
        return ref.where('pid', '==', this.configuration.pid)
      })
        .snapshotChanges()
        .subscribe(players => {
          const playerData = players[0];
          const player = playerData.payload.doc.data();
          const playerKey = playerData.payload.doc.id;
          let mustUpdate = false;
          if (player.hasOwnProperty('stars') && player.stars.includes(game.vid)) {
            player.stars = player.stars.filter(item => item !== game.vid);
            mustUpdate = true;
            if (mustUpdate) {
              this.afs.collection<Player>('players').doc(playerKey).update(player);
            }
          }
        })
    );
  }

  trackFunc(index: number, obj: any) {
    return index;
  }

}
