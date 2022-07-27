import React from "react";
import "error-polyfill";
import "bootstrap/dist/js/bootstrap.bundle";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.scss";
import "./gh-fork-ribbon.css";
import HomePage from "./pages/Home";
import AccountPage from "./pages/Account";
import { HashRouter as Router, Link, Route, Switch } from "react-router-dom";
import * as nearAPI from "near-api-js";
import { AccountData } from "./data/Account";
import Logo from "./images/logo.png";
import PostPage from "./pages/Post";
import { PostData } from "./data/Post";
import DiscoverPage from "./pages/Discover";
import AddStorageButton from "./components/AddStorageButton";
import Device, { isMobileExplorer } from "./device";
import { KeyPair } from "near-api-js";
import { NearConfig } from "./config";

// 4 epochs
const NumBlocksNonArchival = 4 * 12 * 3600;

class App extends React.Component {
  constructor(props) {
    super(props);

    this._near = {
      async blockViewCall(blockId, methodName, args) {
        args = args || {};
        this.account.validateArgs(args);
        const connection =
          blockId + NumBlocksNonArchival < this.lastBlockHeight
            ? this.archivalConnection
            : this.account.connection;
        const result = await connection.provider.query({
          request_type: "call_function",
          block_id: blockId,
          account_id: NearConfig.contractName,
          method_name: methodName,
          args_base64: new Buffer(JSON.stringify(args), "utf8").toString(
            "base64"
          ),
        });
        return (
          result.result &&
          result.result.length > 0 &&
          JSON.parse(Buffer.from(result.result).toString())
        );
      },
    };

    this.state = {
      connected: false,
      isNavCollapsed: true,
      newPosts: [],
      followers: {},
      following: {},
    };

    if (!isMobileExplorer()) {
      this._initNear().then(() => {
        this.setState({
          signedIn: !!this._near.accountId,
          signedAccountId: this._near.accountId,
          connected: true,
        });
      });
    }
  }

  self = this;

  componentDidMount() {
    window.addEventListener("load", () => {
      this._initNear().then(() => {
        this.setState({
          signedIn: !!this._near.accountId,
          signedAccountId: this._near.accountId,
          connected: true,
        });
      });
    });
  }

  async initWithKeystore(keyStore) {
    const near = await nearAPI.connect(
      Object.assign({ deps: { keyStore } }, NearConfig)
    );

    this._near.archivalConnection = nearAPI.Connection.fromConfig({
      networkId: NearConfig.networkId,
      provider: {
        type: "JsonRpcProvider",
        args: { url: NearConfig.archivalNodeUrl },
      },
      signer: { type: "InMemorySigner", keyStore },
    });
    this._near.keyStore = keyStore;
    this._near.near = near;

    this._near.walletConnection = new nearAPI.WalletConnection(
      near,
      NearConfig.contractName
    );
    this._near.accountId = this._near.walletConnection.getAccountId();
    console.log("accountId ", this._near.accountId);
    this._near.account = this._near.walletConnection.account();
    const block = await this._near.account.connection.provider.block({
      finality: "final",
    });
    this._near.lastBlockHeight = block.header.height;
    this._near.contract = new nearAPI.Contract(
      this._near.account,
      NearConfig.contractName,
      {
        viewMethods: [
          "get_account",
          "get_accounts",
          "get_num_accounts",
          "get_followers",
          "get_following",
          "get_post",
          "storage_minimum_balance",
          "storage_balance_of",
        ],
        changeMethods: [
          "storage_deposit",
          "storage_withdraw",
          "post",
          "follow",
          "unfollow",
        ],
      }
    );
    this._near.storageMinimumBalance =
      await this._near.contract.storage_minimum_balance();

    this._near.accounts = {};
    this._near.getAccount = (accountId) => {
      if (accountId in this._near.accounts) {
        return this._near.accounts[accountId];
      }
      return (this._near.accounts[accountId] = Promise.resolve(
        AccountData.load(this._near, accountId)
      ));
    };

    this._near.cacheAccount = (accountId, account) => {
      if (accountId in this._near.accounts) {
        return;
      }
      this._near.accounts[accountId] = Promise.resolve(account);
    };

    this._near.posts = {};
    this._near.getPost = (accountId, blockHeight) => {
      const key = `${accountId}/${blockHeight}`;
      if (key in this._near.posts) {
        return this._near.posts[key];
      }
      return (this._near.posts[key] = Promise.resolve(
        PostData.load(this._near, accountId, blockHeight)
      ));
    };

    if (this._near.accountId) {
      this._near.accountData = await this._near.getAccount(
        this._near.accountId
      );
      await this._near.accountData.fetchStorageBalance();
      await this._near.accountData.fetchFollowings();
      this.setState({
        followings: Object.assign({}, this._near.accountData.followings),
        enoughStorageBalance: this._near.accountData.stats.enoughStorageBalance,
      });
      this._near.accountData.fetchFollowers().then(() => {
        this.setState({
          followers: Object.assign({}, this._near.accountData.followers),
        });
      });
    }
  }

  async _initNear() {
    console.log("running _initNear");
    if (Device.isMobileExplorer()) {
      //window.onload = async () => {
      await this.loginWithNearFi();

      //}
    } else {
      const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
      const near = await nearAPI.connect(
        Object.assign({ deps: { keyStore } }, NearConfig)
      );
      console.log("keystore before", JSON.stringify(near));
      this._near.archivalConnection = nearAPI.Connection.fromConfig({
        networkId: NearConfig.networkId,
        provider: {
          type: "JsonRpcProvider",
          args: { url: NearConfig.archivalNodeUrl },
        },
        signer: { type: "InMemorySigner", keyStore },
      });
      this._near.keyStore = keyStore;
      this._near.near = near;

      this._near.walletConnection = new nearAPI.WalletConnection(
        near,
        NearConfig.contractName
      );
      this._near.accountId = this._near.walletConnection.getAccountId();
      console.log("accountId ", this._near.accountId);
      this._near.account = this._near.walletConnection.account();
      const block = await this._near.account.connection.provider.block({
        finality: "final",
      });
      this._near.lastBlockHeight = block.header.height;
      this._near.contract = new nearAPI.Contract(
        this._near.account,
        NearConfig.contractName,
        {
          viewMethods: [
            "get_account",
            "get_accounts",
            "get_num_accounts",
            "get_followers",
            "get_following",
            "get_post",
            "storage_minimum_balance",
            "storage_balance_of",
          ],
          changeMethods: [
            "storage_deposit",
            "storage_withdraw",
            "post",
            "follow",
            "unfollow",
          ],
        }
      );
      this._near.storageMinimumBalance =
        await this._near.contract.storage_minimum_balance();

      this._near.accounts = {};
      this._near.getAccount = (accountId) => {
        if (accountId in this._near.accounts) {
          return this._near.accounts[accountId];
        }
        return (this._near.accounts[accountId] = Promise.resolve(
          AccountData.load(this._near, accountId)
        ));
      };

      this._near.cacheAccount = (accountId, account) => {
        if (accountId in this._near.accounts) {
          return;
        }
        this._near.accounts[accountId] = Promise.resolve(account);
      };

      this._near.posts = {};
      this._near.getPost = (accountId, blockHeight) => {
        const key = `${accountId}/${blockHeight}`;
        if (key in this._near.posts) {
          return this._near.posts[key];
        }
        return (this._near.posts[key] = Promise.resolve(
          PostData.load(this._near, accountId, blockHeight)
        ));
      };

      if (this._near.accountId) {
        this._near.accountData = await this._near.getAccount(
          this._near.accountId
        );
        await this._near.accountData.fetchStorageBalance();
        await this._near.accountData.fetchFollowings();
        this.setState({
          followings: Object.assign({}, this._near.accountData.followings),
          enoughStorageBalance:
            this._near.accountData.stats.enoughStorageBalance,
        });
        this._near.accountData.fetchFollowers().then(() => {
          this.setState({
            followers: Object.assign({}, this._near.accountData.followers),
          });
        });
      }
    }
  }

  async loginWithNearFi() {
    const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
    let accessKey = await window.nearFiWallet.requestSignIn({
      contractId: NearConfig.contractName,
    });
    if (accessKey && accessKey.accessKey) {
      let keyPair = KeyPair.fromString(accessKey.accessKey.secretKey);
      window.nearFiWallet.log("privateKey", keyPair.getPublicKey().toString());
      let secretKey = accessKey.accessKey.secretKey;
      keyStore.setKey(
        NearConfig.networkId,
        window.nearFiWallet.accountId,
        KeyPair.fromString(secretKey)
      );
      window.localStorage.setItem(
        `${NearConfig.contractName}_wallet_auth_key`,
        JSON.stringify({
          accountId: window.nearFiWallet.accountId,
          allKeys: [KeyPair.fromString(secretKey).getPublicKey().toString()],
        })
      );
      window.localStorage.setItem(
        `near-api-js:keystore:${window.nearFiWallet.accountId}:${NearConfig.networkId}`,
        secretKey
      );
    }
    await this.initWithKeystore(keyStore);
  }

  async requestSignIn(e) {
    //console.log('keys before ',       (await this._near.account()).getAccessKeys())
    if (isMobileExplorer()) {
      try {
        await this.loginWithNearFi();
      } catch (e) {}
    } else {
      e.preventDefault();
      const appTitle = "NEAR.fm";
      await this._near.walletConnection.requestSignIn(
        NearConfig.contractName,
        appTitle
      );
      console.log("keys after ", (await this._near.account()).getAccessKeys());
    }
    return false;
  }

  async logOut() {
    if (window.nearFiWallet) {
      await window.nearFiWallet.signOut();
      window.localStorage.removeItem(
        `${NearConfig.contractName}_wallet_auth_key`
      );
    } else {
      this._near.walletConnection.signOut();
    }
    this._near.accountId = null;
    this.setState({
      signedIn: !!this._accountId,
      signedAccountId: this._accountId,
    });
  }

  getWalletTitle() {
    if (isMobileExplorer()) {
      return "Sign in with NearFi Wallet"
    }
    return "Sign in with NEAR Wallet"
  }

  render() {
    const passProps = {
      _near: this._near,
      updateState: (s) => this.setState(s),
      ...this.state,
    };
    const header = !this.state.connected ? (
      <div>
        Connecting...{" "}
        <span
          className="spinner-grow spinner-grow-sm"
          role="status"
          aria-hidden="true"
        ></span>
      </div>
    ) : this.state.signedIn ? (
      <div>
        <AddStorageButton {...passProps} />
        <button
          className="btn btn-outline-secondary"
          onClick={() => this.logOut()}
        >
          Sign out ({this.state.signedAccountId})
        </button>
      </div>
    ) : (
      <div>
        <button
          className="btn btn-primary"
          onClick={(e) => this.requestSignIn(e)}
        >
          {this.getWalletTitle()}
        </button>
      </div>
    );

    return (
      <div className="App">
        <Router basename={process.env.PUBLIC_URL}>
          <nav className="navbar navbar-expand-lg navbar-light bg-light mb-3">
            <div className="container-fluid">
              <Link className="navbar-brand" to="/" title="NEAR.fm">
                <img
                  src={Logo}
                  alt="NEAR.fm"
                  className="d-inline-block align-middle"
                />
                [TESTNET] NEAR.fm
              </Link>
              <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="false"
                aria-label="Toggle navigation"
              >
                <span className="navbar-toggler-icon"></span>
              </button>
              <div
                className="collapse navbar-collapse"
                id="navbarSupportedContent"
              >
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                  <li className="nav-item">
                    <Link className="nav-link" aria-current="page" to="/">
                      Home
                    </Link>
                  </li>
                  {this.state.signedIn && (
                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        aria-current="page"
                        to="/discover"
                      >
                        Discover
                      </Link>
                    </li>
                  )}
                  {this.state.signedIn && (
                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        aria-current="page"
                        to={`/a/${this.state.signedAccountId}`}
                      >
                        Profile
                      </Link>
                    </li>
                  )}
                </ul>
                <form className="d-flex">{header}</form>
              </div>
            </div>
          </nav>

          <a
            className="github-fork-ribbon right-bottom fixed"
            href="https://github.com/evgenykuzyakov/near-fm"
            data-ribbon="NearFi Wallet Social App"
            title="NearFi Wallet Social App"
          >
            NearFi Wallet Social App
          </a>

          <Switch>
            <Route exact path={"/"}>
              {this.state.signedIn ? (
                <HomePage {...passProps} />
              ) : (
                <DiscoverPage {...passProps} />
              )}
            </Route>
            <Route exact path={"/discover"}>
              <DiscoverPage {...passProps} />
            </Route>
            <Route exact path={"/a/:accountId"}>
              <AccountPage {...passProps} />
            </Route>
            <Route path={"/a/:accountId/:suffix"}>
              <AccountPage {...passProps} />
            </Route>
            <Route exact path={"/p/:accountId/:blockHeight"}>
              <PostPage {...passProps} />
            </Route>
          </Switch>
        </Router>
      </div>
    );
  }
}

export default App;
