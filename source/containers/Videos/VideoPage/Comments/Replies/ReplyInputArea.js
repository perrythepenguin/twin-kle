import PropTypes from 'prop-types'
import React from 'react'
import InputArea from 'components/Texts/InputArea'

ReplyInputArea.propTypes = {
  onSubmit: PropTypes.func,
  clickListenerState: PropTypes.bool,
  style: PropTypes.object
}
export default function ReplyInputArea({onSubmit, clickListenerState, style}) {
  return (
    <div className="media" style={style}>
      <div className="media-body">
        <InputArea
          autoFocus
          clickListenerState={clickListenerState}
          onSubmit={text => onSubmit(text)}
          rows={4}
          placeholder="Post your reply"
        />
      </div>
    </div>
  )
}
