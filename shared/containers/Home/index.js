import React, {Component , PropTypes} from 'react';
import {Color} from 'constants/css';
import {connect} from 'react-redux';
import {browserHistory} from 'react-router';


@connect(
  state => ({
    username: state.UserReducer.username
  })
)
export default class Home extends Component {
  constructor() {
    super()
    this.state = {
      selectedTab: null
    }
  }

  componentDidMount() {
    this.setState({selectedTab: !!this.props.params.username ? 'profile' : 'feed'})
  }

  componentDidUpdate(prevProps) {
    if (prevProps.params.username !== this.props.params.username) {
      this.setState({
        selectedTab: !!this.props.params.username ? 'profile' : 'feed'
      })
    }
  }

  render() {
    const {username} = this.props;
    const {selectedTab} = this.state;
    const listStyle = {
      profile: {
        cursor: 'pointer',
        backgroundColor: selectedTab === 'profile' ? Color.lightGray : Color.backgroundGray,
        border: 'none',
        fontWeight: selectedTab === 'profile' && 'bold'
      },
      feed: {
        cursor: 'pointer',
        backgroundColor: selectedTab === 'feed' ? Color.lightGray : Color.backgroundGray,
        border: 'none',
        fontWeight: selectedTab === 'feed' && 'bold'
      }
    };
    return (
      <div className="container-fluid">
        <div
          className="col-xs-2 col-xs-offset-1"
          style={{
            marginTop: '2em',
            position: 'fixed'
          }}
        >
          <ul className="list-group unselectable" style={{fontSize: '1.3em'}}>
            <li
              className="list-group-item left-menu-item"
              style={listStyle.profile}
              onClick={() => browserHistory.push(`/${username}`)}
            >
              <a
                style={{
                  textDecoration: 'none',
                  color: selectedTab === 'profile' ? Color.black : Color.darkGray
                }}
              >
                Profile
              </a>
            </li>
            <li
              className="list-group-item left-menu-item"
              style={listStyle.feed}
              onClick={() => browserHistory.push('/')}
            >
              <a
                style={{
                  textDecoration: 'none',
                  color: selectedTab === 'feed' ? Color.black : Color.darkGray
                }}
              >
                News Feed
              </a>
            </li>
          </ul>
        </div>
        <div className="col-xs-6 col-xs-offset-4">
          {this.props.children}
        </div>
      </div>
    )
  }
}
