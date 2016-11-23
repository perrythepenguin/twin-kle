import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {timeSince} from 'helpers/timeStampHelpers';
import {cleanStringWithURL} from 'helpers/stringHelpers';
import SmallDropdownButton from 'components/SmallDropdownButton';
import Likers from 'components/Likers';
import UserListModal from 'components/Modals/UserListModal';
import ReplyInputArea from './Replies/ReplyInputArea';
import Replies from './Replies';
import EditTextArea from './EditTextArea';
import UsernameText from 'components/UsernameText';
import Button from 'components/Button';
import LikeButton from 'components/LikeButton';
import {scrollElementToCenter} from 'helpers/domHelpers';
import ConfirmModal from 'components/Modals/ConfirmModal';


export default class Comment extends Component {
  constructor() {
    super()
    this.state = {
      replyInputShown: false,
      onEdit: false,
      userListModalShown: false,
      clickListenerState: false,
      confirmModalShown: false
    }
    this.onReplyButtonClick = this.onReplyButtonClick.bind(this)
    this.onReplySubmit = this.onReplySubmit.bind(this)
    this.onDelete = this.onDelete.bind(this)
    this.onEditDone = this.onEditDone.bind(this)
    this.onLikeClick = this.onLikeClick.bind(this)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.deleteListenerToggle !== this.props.deleteListenerToggle) {
      if (this.props.lastDeletedCommentIndex - 1 === this.props.index) {
        scrollElementToCenter(this.Comment);
      }
    }
  }

  render() {
    const {replyInputShown, onEdit, userListModalShown, clickListenerState, confirmModalShown} = this.state;
    const {comment, userId, commentId, videoId,
      onEditDone, onLoadMoreReplies, onDelete, deleteCallback, index
    } = this.props;
    const userIsOwner = comment.userId === userId;
    let userLikedThis = false;
    for (let i = 0; i < comment.likes.length; i++) {
      if (comment.likes[i].userId === userId) userLikedThis = true;
    }
    return (
      <li
        className="media"
        style={{marginTop: this.props.marginTop && '2em'}}
        ref={ref => {this.Comment = ref}}
      >
        <div className="media-left">
          <a>
            <img
              className="media-object"
              src="/img/default.jpg"
              style={{width: '64px'}}
            />
          </a>
        </div>
        <div className="media-body">
          {userIsOwner && !onEdit &&
            <SmallDropdownButton
              shape="button"
              icon="pencil"
              style={{
                position: 'relative',
                float: 'right'
              }}
              menuProps={[
                {
                  label: "Edit",
                  onClick: () => this.setState({onEdit: true})
                },
                {
                  label: "Remove",
                  onClick: () => this.setState({confirmModalShown: true})
                }
              ]}
            />
          }
          <h4 className="media-heading">
            <UsernameText user={{
              name: comment.username,
              id: comment.userId
            }} /> <small>&nbsp;{timeSince(comment.timeStamp)}</small>
          </h4>
          {onEdit ?
            <EditTextArea
              autoFocus
              text={cleanStringWithURL(comment.content)}
              onCancel={() => this.setState({onEdit: false})}
              onEditDone={this.onEditDone}
            /> :
            <div className="container-fluid">
              {!!comment.debateTopic &&
                <div
                  className="row"
                  style={{
                    color: '#158cba',
                    fontWeight: 'bold',
                    marginBottom: '0.5em'
                  }}
                >
                  Discussion Topic: {comment.debateTopic}
                </div>
              }
              <div
                className="row"
                style={{paddingBottom: '1.7em'}}
                dangerouslySetInnerHTML={{__html: comment.content}}
              ></div>
              <div
                className="row flexbox-container"
              >
                <div className="pull-left">
                  <LikeButton
                    onClick={this.onLikeClick}
                    liked={userLikedThis}
                    small
                  />
                  <Button
                    style={{marginLeft: '0.5em'}}
                    className="btn btn-warning btn-sm"
                    onClick={this.onReplyButtonClick}
                  >
                    <span className="glyphicon glyphicon-comment"></span> Reply
                  </Button>
                </div>
                <small>
                  <Likers
                    className="pull-left"
                    style={{
                      fontWeight: 'bold',
                      marginLeft: '0.8em',
                      color: '#f0ad4e',
                      marginTop: '1em'
                    }}
                    userId={userId}
                    likes={comment.likes}
                    onLinkClick={() => this.setState({userListModalShown: true})}
                  />
                </small>
              </div>
            </div>
          }
          <Replies
            onLoadMoreReplies={onLoadMoreReplies}
            userId={userId}
            comment={comment}
            replies={comment.replies}
            commentId={commentId}
            videoId={videoId}
            onEditDone={onEditDone}
            onReplySubmit={this.props.onReplySubmit}
            onLikeClick={replyId => this.props.onLikeClick(replyId)}
            onDelete={replyId => this.props.onDelete(replyId)}
          />
          {replyInputShown && <ReplyInputArea
              clickListenerState={clickListenerState}
              onSubmit={this.onReplySubmit}
            />
          }
        </div>
        {userListModalShown &&
          <UserListModal
            onHide={() => this.setState({userListModalShown: false})}
            title="People who liked this comment"
            userId={userId}
            users={comment.likes}
            description={user => user.userId === userId && '(You)'}
          />
        }
        {confirmModalShown &&
          <ConfirmModal
            onHide={() => this.setState({confirmModalShown: false})}
            title="Remove Comment"
            onConfirm={this.onDelete}
          />
        }
      </li>
    )
  }

  onDelete() {
    const {deleteCallback, onDelete, index, commentId} = this.props;
    deleteCallback(index);
    onDelete(commentId)
  }

  onEditDone(editedComment) {
    const {commentId} = this.props;
    this.props.onEditDone({editedComment, commentId}, () => {
      this.setState({onEdit: false})
    })
  }

  onLikeClick() {
    const {commentId} = this.props;
    this.props.onLikeClick(commentId);
  }

  onReplyButtonClick() {
    const {replyInputShown, clickListenerState} = this.state;
    if (!replyInputShown) {
      return this.setState({replyInputShown: true})
    }
    this.setState({clickListenerState: !clickListenerState})
  }

  onReplySubmit(reply) {
    const {commentId, videoId} = this.props;
    this.props.onReplySubmit(reply, commentId, videoId);
  }
}
