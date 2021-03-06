import PropTypes from 'prop-types'
import React, {Component} from 'react'
import SmallDropdownButton from 'components/SmallDropdownButton'
import UsernameText from 'components/Texts/UsernameText'
import Textarea from 'react-textarea-autosize'
import Button from 'components/Button'
import LongText from 'components/Texts/LongText'
import {timeSince} from 'helpers/timeStampHelpers'
import {cleanString, cleanStringWithURL, stringIsEmpty} from 'helpers/stringHelpers'

export default class Description extends Component {
  static propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    onDelete: PropTypes.func,
    uploaderId: PropTypes.number,
    userId: PropTypes.number,
    uploaderName: PropTypes.string,
    timeStamp: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    videoId: PropTypes.number,
    onEditFinish: PropTypes.func
  }

  constructor(props) {
    super()
    this.state = {
      onEdit: false,
      editedTitle: cleanString(props.title),
      editedDescription: cleanStringWithURL(props.description),
      editDoneButtonDisabled: true
    }
    this.onEditFinish = this.onEditFinish.bind(this)
    this.onEditCancel = this.onEditCancel.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.title !== this.props.title) {
      this.setState({
        editedTitle: cleanString(nextProps.title)
      })
    }
    if (nextProps.description !== this.props.description) {
      this.setState({
        editedDescription: cleanStringWithURL(nextProps.description)
      })
    }
  }

  render() {
    const menuProps = [
      {
        label: 'Edit',
        onClick: () => this.setState({onEdit: true})
      },
      {
        label: 'Delete',
        onClick: () => this.props.onDelete()
      }
    ]

    const {uploaderId, userId, uploaderName, title, description, timeStamp} = this.props
    let {onEdit, editedTitle, editedDescription, editDoneButtonDisabled} = this.state
    editedDescription = editedDescription === 'No description' ? '' : this.state.editedDescription
    return (
      <div>
        <div
          className="row page-header text-center"
          style={{paddingBottom: '1em'}}
        >
          {uploaderId === userId && !onEdit &&
            <SmallDropdownButton
              style={{
                right: '2em',
                position: 'absolute'
              }}
              shape="button" icon="pencil"
              menuProps={menuProps} />
          }
          <div>
            {onEdit ?
              <form className="col-sm-6 col-sm-offset-3" onSubmit={event => event.preventDefault()}>
                <input
                  ref="editTitleInput"
                  type="text"
                  className="form-control"
                  placeholder="Enter Title..."
                  value={editedTitle}
                  onChange={event => {
                    this.setState({editedTitle: event.target.value}, () => {
                      this.determineEditButtonDoneStatus()
                    })
                  }}
                />
              </form> :
              <h1>
                <span style={{wordWrap: 'break-word'}}>{cleanString(title)}</span>
              </h1>
            }
          </div>
          <div
            className="col-sm-12"
            style={{
              paddingTop: onEdit && '1em'
            }}
          >
            <small
              style={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                lineHeight: 'normal'
              }}>Added by <UsernameText user={{name: uploaderName, id: uploaderId}} /> {`${timeStamp ? '(' + timeSince(timeStamp) + ')' : ''}`}
            </small>
          </div>
        </div>
        <div className="row container-fluid">
          <h2>Description</h2>
          {onEdit ?
            <div>
              <form>
                <Textarea
                  minRows={4}
                  className="form-control"
                  placeholder="Enter Description"
                  value={editedDescription}
                  onChange={event => {
                    this.determineEditButtonDoneStatus()
                    this.setState({editedDescription: event.target.value}, () => {
                      this.determineEditButtonDoneStatus()
                    })
                  }}
                 />
              </form>
              <div
                className="row container-fluid text-center"
                style={{
                  marginTop: '1em'
                }}
              >
                <Button
                  className="btn btn-default btn-sm"
                  disabled={editDoneButtonDisabled}
                  onClick={this.onEditFinish}
                >Done</Button>
                <Button
                  className="btn btn-default btn-sm"
                  style={{marginLeft: '5px'}}
                  onClick={this.onEditCancel}
                >Cancel</Button>
              </div>
            </div> :
            <LongText style={{wordWrap: 'break-word'}}>
              {stringIsEmpty(description) ? 'No Description' : description}
            </LongText>
          }
        </div>
      </div>
    )
  }

  determineEditButtonDoneStatus() {
    const titleIsEmpty = stringIsEmpty(this.state.editedTitle)
    const titleChanged = this.state.editedTitle !== this.props.title
    const descriptionChanged = this.state.editedDescription !== cleanStringWithURL(this.props.description)
    const editDoneButtonDisabled = titleIsEmpty || (!titleChanged && !descriptionChanged)
    this.setState({editDoneButtonDisabled})
  }

  onEditFinish() {
    const params = {
      videoId: this.props.videoId,
      title: this.state.editedTitle,
      description: this.state.editedDescription
    }
    this.props.onEditFinish(params, this)
  }

  onEditCancel() {
    const {description} = this.props
    const editedDescription = description === 'No description' ? '' : cleanStringWithURL(description)
    this.setState({
      editedTitle: cleanString(this.props.title),
      editedDescription,
      onEdit: false,
      editDoneButtonDisabled: true
    })
  }
}
