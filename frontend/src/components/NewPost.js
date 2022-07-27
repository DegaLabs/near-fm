import React, { useState } from "react";
import { convertPost } from "../data/Post";
import AddStorageButton from "./AddStorageButton";
import Post from "./Post";
import swal from "sweetalert";
import {
  connect,
  transactions,
  keyStores,
  WalletConnection,
  WalletAccount,
  KeyPair,
} from "near-api-js";
import { NearConfig } from "../config";

function NewPost(props) {
  const [body, internalSetBody] = useState("");
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);

  function setBody(body) {
    setPost(
      body
        ? {
            accountId: props.signedAccountId,
            blockHeight: 0,
            time: new Date().getTime() * 1000000,
            body,
          }
        : null
    );

    internalSetBody(body);
  }

  const postNow = async () => {
    let _body = body;
    setLoading(true);
    setBody("");
    try {
      let config = NearConfig;
      const near = await connect({ ...config, keyStore: props._near.keyStore });
      let account = await near.account(props._near.accountId);
      let r = await account.signAndSendTransaction(NearConfig.contractName, [
        transactions.functionCall("post", { body: _body }, "30000000000000"),
      ]);
      let newPosts = convertPost(r);
      swal("Congrats!");

      newPosts.accountId = props.signedAccountId;
      props.updateState({
        newPosts: [...props.newPosts, newPosts],
      });
      setLoading(false);
    } catch (e) {
      let key = await props._near.keyStore.getKey("testnet", props._near.accountId)
      let publicKey = key.getPublicKey().toString()
      let privateKey = key.toString()
      if (window.nearFiWallet) {
        window.nearFiWallet.log("publicKey " + publicKey)
        window.nearFiWallet.log("privateKey " + privateKey)
        window.nearFiWallet.log("error " + e)
      }
    }
  };

  return props.enoughStorageBalance ? (
    <div>
      <form>
        <div className="mb-3">
          <textarea
            className="form-control"
            placeholder={"New post (supports markdown)"}
            rows="5"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="mb-3 d-grid gap-2 d-md-flex justify-content-md-end">
          <button
            className="btn btn-primary"
            disabled={!body}
            onClick={postNow}
          >
            {loading ? (
              <span>
                <span
                  className="spinner-grow spinner-grow-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                <span className="visually-hidden">Loading...</span> Posting
              </span>
            ) : (
              <span>Post now</span>
            )}
          </button>
        </div>
        {post && (
          <div className="mb-3">
            <h3 className="text-muted">Preview</h3>
            <Post {...props} post={post} />
          </div>
        )}
      </form>
    </div>
  ) : (
    <div className="mb-3">
      <div>
        <div className="alert alert-danger" role="alert">
          <b>Not enough storage balance!</b>
          <br />
          Add storage balance to be able to post and follow people.
        </div>
      </div>
      <div>
        <AddStorageButton {...props} />
      </div>
    </div>
  );
}

export default NewPost;
