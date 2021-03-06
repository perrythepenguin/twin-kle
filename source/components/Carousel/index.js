import React, {Component} from 'react'
import assign from 'object-assign'
import ExecutionEnvironment from 'exenv'
import ButtonGroup from 'components/ButtonGroup'
import NavButton from './NavButton'
import {connect} from 'react-redux'
import {clickSafeOn, clickSafeOff} from 'redux/actions/PlaylistActions'
import {
  getListStyles,
  getFrameStyles,
  getSliderStyles,
  getStyleTagStyles,
  formatChildren,
  setInitialDimensions,
  setDimensions,
  setExternalData } from './helpers/styles'
import {
  goToSlide,
  nextSlide,
  previousSlide } from './helpers/actions'
import {
  getTouchEvents,
  getMouseEvents,
  handleClick } from './helpers/interfaceEvents'

import {easeInOutQuad} from 'tween-functions'
import PropTypes from 'prop-types'
import requestAnimationFrame from 'raf'
import {addEvent, removeEvent} from 'helpers/listenerHelpers'

const DEFAULT_STACK_BEHAVIOR = 'ADDITIVE'
const DEFAULT_EASING = easeInOutQuad
const DEFAULT_DURATION = 300
const DEFAULT_DELAY = 0

const stackBehavior = {
  ADDITIVE: 'ADDITIVE',
  DESTRUCTIVE: 'DESTRUCTIVE'
}

@connect(
  state => ({
    chatMode: state.ChatReducer.chatMode,
    clickSafe: state.PlaylistReducer.clickSafe
  }),
  {clickSafeOn, clickSafeOff}
)
export default class Carousel extends Component {
  static propTypes = {
    slideIndex: PropTypes.number,
    slidesToScroll: PropTypes.number,
    chatMode: PropTypes.bool,
    children: PropTypes.array,
    className: PropTypes.string,
    clickSafe: PropTypes.bool,
    style: PropTypes.object,
    userIsUploader: PropTypes.bool,
    showQuestionsBuilder: PropTypes.func,
    progressBar: PropTypes.bool,
    onFinish: PropTypes.func
  }

  static defaultProps = {
    afterSlide: function() { },
    beforeSlide: function() { },
    cellAlign: 'left',
    cellSpacing: 0,
    data: function() {},
    dragging: true,
    easing: 'easeOutCirc',
    edgeEasing: 'easeOutElastic',
    framePadding: '0px',
    slideIndex: 0,
    slidesToScroll: 1,
    slidesToShow: 1,
    slideWidth: 1,
    speed: 500,
    width: '100%'
  }

  static touchObject = {}
  static rafID = null

  constructor(props) {
    super()
    this.state = {
      tweenQueue: [],
      currentSlide: props.slideIndex,
      dragging: false,
      frameWidth: 0,
      left: 0,
      slideCount: 0,
      slidesToScroll: props.slidesToScroll,
      slideWidth: 0,
      top: 0
    }
    this.rafCb = this.rafCb.bind(this)
    this.getTweeningValue = this.getTweeningValue.bind(this)
    this.onResize = this.onResize.bind(this)
    this.onReadyStateChange = this.onReadyStateChange.bind(this)
  }

  componentWillMount() {
    setInitialDimensions.call(this)
  }

  componentDidMount() {
    setDimensions.call(this)
    bindListeners.call(this)
    setExternalData.call(this)

    function bindListeners() {
      if (ExecutionEnvironment.canUseDOM) {
        addEvent(window, 'resize', this.onResize)
        addEvent(document, 'readystatechange', this.onReadyStateChange)
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.clickSafe !== nextProps.clickSafe) return
    this.setState({
      slideCount: nextProps.children.length
    })

    if (nextProps.slideIndex !== this.state.currentSlide) {
      goToSlide.call(this, nextProps.slideIndex)
    }
  }

  componentDidUpdate(prevProps) {
    if (!this.props.chatMode && prevProps.chatMode !== this.props.chatMode) {
      setTimeout(setDimensions.bind(this), 0)
    }
  }

  componentWillUnmount() {
    unbindListeners.call(this)
    requestAnimationFrame.cancel(this.rafID)
    this.rafID = -1

    function unbindListeners() {
      if (ExecutionEnvironment.canUseDOM) {
        removeEvent(window, 'resize', this.onResize)
        removeEvent(document, 'readystatechange', this.onReadyStateChange)
      }
    }
  }

  render() {
    var children = React.Children.count(this.props.children) > 1 ? formatChildren.call(this, this.props.children) : this.props.children
    const slideFraction = (this.state.currentSlide + 1)/this.state.slideCount
    return (
      <div className={['slider', this.props.className || ''].join(' ')} ref="slider" style={assign(getSliderStyles.call(this), this.props.style || {})}>
        { this.props.userIsUploader &&
          <a
            style={{
              position: 'absolute',
              cursor: 'pointer'
            }}
            onClick={() => this.props.showQuestionsBuilder()}
          >Add/Edit Questions</a>
        }
        {this.props.progressBar &&
          <div>
            <div
              className="text-center"
            >
              <ButtonGroup
                buttons={[
                  {
                    label: 'Prev',
                    onClick: previousSlide.bind(this),
                    buttonClass: 'btn-default',
                    disabled: this.state.currentSlide === 0
                  },
                  {
                    label: this.state.currentSlide + 1 === this.state.slideCount ? 'Finish' : 'Next',
                    onClick: this.state.currentSlide + 1 === this.state.slideCount ? this.props.onFinish : nextSlide.bind(this),
                    buttonClass: 'btn-default'
                  }
                ]}
              />
            </div>
            <div
              className="progress"
              style={{marginTop: '2rem'}}
            >
              <div
                className="progress-bar"
                role="progressbar"
                aria-valuenow="0"
                aria-valuemin="0"
                aria-valuemax="100"
                style={{width: `${slideFraction*100}%`}}
              >{`${this.state.currentSlide + 1}/${this.state.slideCount}`}</div>
            </div>
          </div>
        }
        <div className="slider-frame"
          ref="frame"
          style={getFrameStyles.call(this)}
          {...getTouchEvents.call(this)}
          {...getMouseEvents.call(this)}
          onClick={handleClick.bind(this)}>
          <ul className="slider-list" ref="list" style={getListStyles.call(this)}>
            {children}
          </ul>
        </div>
        {!this.props.progressBar &&
          [
            <NavButton
              left
              key={0}
              disabled={this.state.currentSlide === 0}
              nextSlide={previousSlide.bind(this)}
            />,
            <NavButton
              key={1}
              disabled={this.state.currentSlide + this.state.slidesToScroll >= this.state.slideCount}
              nextSlide={nextSlide.bind(this)}
            />
          ]
        }
        <style type="text/css" dangerouslySetInnerHTML={{__html: getStyleTagStyles.call(this)}}/>
      </div>
    )
  }

  tweenState(path, {easing, duration, delay, beginValue, endValue, onEnd, stackBehavior: configSB}) {
    this.setState(state => {
      let cursor = state
      let stateName
      // see comment below on pash hash
      let pathHash
      if (typeof path === 'string') {
        stateName = path
        pathHash = path
      } else {
        for (let i = 0; i < path.length - 1; i++) {
          cursor = cursor[path[i]]
        }
        stateName = path[path.length - 1]
        pathHash = path.join('|')
      }
      // see the reasoning for these defaults at the top of file
      const newConfig = {
        easing: easing || DEFAULT_EASING,
        duration: duration == null ? DEFAULT_DURATION : duration,
        delay: delay == null ? DEFAULT_DELAY : delay,
        beginValue: beginValue == null ? cursor[stateName] : beginValue,
        endValue: endValue,
        onEnd: onEnd,
        stackBehavior: configSB || DEFAULT_STACK_BEHAVIOR
      }

      let newTweenQueue = state.tweenQueue
      if (newConfig.stackBehavior === stackBehavior.DESTRUCTIVE) {
        newTweenQueue = state.tweenQueue.filter(item => item.pathHash !== pathHash)
      }

      // we store path hash, so that during value retrieval we can use hash
      // comparison to find the path. See the kind of shitty thing you have to
      // do when you don't have value comparison for collections?
      newTweenQueue.push({
        pathHash: pathHash,
        config: newConfig,
        initTime: Date.now() + newConfig.delay
      })

      // sorry for mutating. For perf reasons we don't want to deep clone.
      // guys, can we please all start using persistent collections so that
      // we can stop worrying about nonesense like this
      cursor[stateName] = newConfig.endValue
      if (newTweenQueue.length === 1) {
        this.rafID = requestAnimationFrame(this.rafCb)
      }

      // this will also include the above mutated update
      return {tweenQueue: newTweenQueue}
    })
  }

  getTweeningValue(path) {
    const state = this.state

    let tweeningValue
    let pathHash
    if (typeof path === 'string') {
      tweeningValue = state[path]
      pathHash = path
    } else {
      tweeningValue = state
      for (let i = 0; i < path.length; i++) {
        tweeningValue = tweeningValue[path[i]]
      }
      pathHash = path.join('|')
    }
    let now = Date.now()

    for (let i = 0; i < state.tweenQueue.length; i++) {
      const {pathHash: itemPathHash, initTime, config} = state.tweenQueue[i]
      if (itemPathHash !== pathHash) {
        continue
      }

      const progressTime = now - initTime > config.duration
        ? config.duration
        : Math.max(0, now - initTime)
      // `now - initTime` can be negative if initTime is scheduled in the
      // future by a delay. In this case we take 0

      // if duration is 0, consider that as jumping to endValue directly. This
      // is needed because the easing functino might have undefined behavior for
      // duration = 0
      const easeValue = config.duration === 0 ? config.endValue : config.easing(
        progressTime,
        config.beginValue,
        config.endValue,
        config.duration,
        // TODO: some funcs accept a 5th param
      )
      const contrib = easeValue - config.endValue
      tweeningValue += contrib
    }

    return tweeningValue
  }

  rafCb() {
    const state = this.state
    if (state.tweenQueue.length === 0) {
      return
    }

    const now = Date.now()
    let newTweenQueue = []

    for (let i = 0; i < state.tweenQueue.length; i++) {
      const item = state.tweenQueue[i]
      const {initTime, config} = item
      if (now - initTime < config.duration) {
        newTweenQueue.push(item)
      } else {
        config.onEnd && config.onEnd()
      }
    }

    // onEnd might trigger a parent callback that removes this component
    // -1 means we've canceled it in componentWillUnmount
    if (this.rafID === -1) {
      return
    }

    this.setState({
      tweenQueue: newTweenQueue
    })

    this.rafID = requestAnimationFrame(this.rafCb)
  }

  onResize() {
    if (!this.props.chatMode) {
      setDimensions.call(this)
    }
  }

  onReadyStateChange() {
    setDimensions.call(this)
  }
}
