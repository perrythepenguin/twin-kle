import PropTypes from 'prop-types'
import React, {Component} from 'react'
import {connect} from 'react-redux'

export default function(InnerComponent) {
  class AdminOnly extends Component {
    static propTypes = {
      isAdmin: PropTypes.bool
    }

    static contextTypes = {
      router: PropTypes.object
    }

    componentWillMount() {
      if (!this.props.isAdmin) {
        this.context.router.push('/')
      }
    }

    componentWillUpdate(nextProps) {
      if (!nextProps.isAdmin) {
        this.context.router.push('/')
      }
    }

    render() {
      const {isAdmin} = this.props
      return isAdmin ?
      <InnerComponent {...this.props} /> : null
    }
  }

  return connect(
    state => ({
      isAdmin: state.UserReducer.isAdmin
    })
  )(AdminOnly)
}
