import PropTypes from 'prop-types'
/* global requestAnimationFrame, cancelAnimationFrame */

import React, {Component} from 'react'
import {processedStringWithURL} from 'helpers/stringHelpers'

export default class Truncate extends Component {
  static propTypes = {
    children: PropTypes.node,
    ellipsis: PropTypes.node,
    lines: PropTypes.oneOfType([
      PropTypes.oneOf([false]),
      PropTypes.number
    ]),
    onTruncate: PropTypes.func
  }

  static defaultProps = {
    children: '',
    ellipsis: '…',
    lines: 1
  }

  state = {}

  constructor(...args) {
    super(...args)

    this.onResize = this.onResize.bind(this)
    this.onTruncate = this.onTruncate.bind(this)
    this.calcTargetWidth = this.calcTargetWidth.bind(this)
    this.measureWidth = this.measureWidth.bind(this)
    this.getLines = this.getLines.bind(this)
    this.renderLine = this.renderLine.bind(this)
  }

  componentDidMount() {
    const {
        refs: {
            text,
            ellipsis
        },
        calcTargetWidth,
        onResize
    } = this

    const canvas = document.createElement('canvas')
    this.canvas = canvas.getContext('2d')

    document.body.appendChild(ellipsis)

    calcTargetWidth(() => {
      if (text) {
        text.parentNode.removeChild(text)
      }
    })

    window.addEventListener('resize', onResize)
  }

  componentDidUpdate(prevProps) {
    if (this.props.children !== prevProps.children) {
      this.forceUpdate()
    }
  }

  componentWillUnmount() {
    const {
        refs: {
            ellipsis
        },
        onResize,
        timeout
    } = this

    ellipsis.parentNode.removeChild(ellipsis)

    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(timeout)
  }

  innerText(node) {
    const div = document.createElement('div')
    div.innerHTML = node.innerHTML.replace(/\r\n|\r|\n/g, ' ')

    let text = div.innerText

    const test = document.createElement('div')
    test.innerHTML = 'foo<br/>bar'

    if (test.innerText.replace(/\r\n|\r/g, '\n') !== 'foo\nbar') {
      /* eslint-disable no-useless-escape */
      div.innerHTML = div.innerHTML.replace(/<br.*?[\/]?>/gi, '\n')
      /* eslint-enable no-useless-escape */
      text = div.innerText
    }

    return text
  }

  onTruncate(didTruncate) {
    const {
        onTruncate
    } = this.props

    if (typeof onTruncate === 'function') {
      this.timeout = requestAnimationFrame(() => {
        onTruncate(didTruncate)
      })
    }
  }

  onResize() {
    this.calcTargetWidth()
  }

  calcTargetWidth(callback) {
    const {
      refs: {
          target
      },
      calcTargetWidth,
      canvas
    } = this

    if (!target) {
      return
    }

    const targetWidth = target.parentNode.getBoundingClientRect().width

    if (!targetWidth) {
      return requestAnimationFrame(() => calcTargetWidth(callback))
    }

    const style = window.getComputedStyle(target)

    const font = [
      style['font-weight'],
      style['font-style'],
      style['font-size'],
      style['font-family']
    ].join(' ')

    canvas.font = font

    this.setState({
      targetWidth
    }, callback)
  }

  measureWidth(text) {
    return this.canvas.measureText(text).width
  }

  ellipsisWidth(node) {
    return node.offsetWidth
  }

  getLines() {
    const {
      refs,
      props: {
        lines: numLines,
        ellipsis
      },
      state: {
        targetWidth
      },
      innerText,
      measureWidth,
      onTruncate
    } = this

    const lines = []
    const text = innerText(refs.text)
    const textLines = text.split('\n').map(line => line.split(' '))
    let didTruncate = true
    const ellipsisWidth = this.ellipsisWidth(this.refs.ellipsis)

    for (let line = 1; line <= numLines; line++) {
      const textWords = textLines[0]
      if (textWords.length === 0) {
        lines.push()
        textLines.shift()
        line--
        continue
      }
      let resultLine = textWords.join(' ')

      if (measureWidth(resultLine) <= targetWidth) {
        if (textLines.length === 1) {
          didTruncate = false
          lines.push(processedStringWithURL(resultLine))
          break
        }
      }

      if (line === numLines) {
        const textRest = textWords.join(' ')

        let lower = 0
        let upper = textRest.length - 1

        while (lower <= upper) {
          const middle = Math.floor((lower + upper) / 2)

          const testLine = textRest.slice(0, middle + 1)

          if (measureWidth(testLine) + ellipsisWidth <= targetWidth) {
            lower = middle + 1
          } else {
            upper = middle - 1
          }
        }

        resultLine = <span>{textRest.slice(0, lower)}{ellipsis}</span>
      } else {
        let lower = 0
        let upper = textWords.length - 1

        while (lower <= upper) {
          const middle = Math.floor((lower + upper) / 2)

          const testLine = textWords.slice(0, middle + 1).join(' ')

          if (measureWidth(testLine) <= targetWidth) {
            lower = middle + 1
          } else {
            upper = middle - 1
          }
        }

        if (lower === 0) {
          line = numLines - 1
          continue
        }

        resultLine = textWords.slice(0, lower).join(' ')
        textLines[0].splice(0, lower)
      }
      lines.push(processedStringWithURL(resultLine))
    }

    onTruncate(didTruncate)

    return lines
  }

  renderLine(line, i, arr) {
    let span = typeof line === 'string' ?
      <span key={i} dangerouslySetInnerHTML={{__html: line}}/> : <span key={i}>{line}</span>
    if (i === arr.length - 1) {
      return span
    } else {
      const br = <br key={i + 'br'} />

      if (line) {
        return [
          span,
          br
        ]
      } else {
        return br
      }
    }
  }

  render() {
    const {
      refs: {
        target
      },
      props: {
        children,
        ellipsis,
        lines,
        ...spanProps
      },
      state: {
        targetWidth
      },
      getLines,
      renderLine,
      onTruncate
    } = this

    let text

    const mounted = !!(target && targetWidth)

    if (typeof window !== 'undefined' && mounted) {
      if (lines > 0) {
        text = getLines().map(renderLine)
      } else {
        text = children
        onTruncate(false)
      }
    }

    delete spanProps.onTruncate

    return (
      <span {...spanProps} ref='target'>
        {text}
        <span ref='text'>{children}</span>
        <span ref='ellipsis' style={this.styles.ellipsis}>
          {ellipsis}
        </span>
      </span>
    )
  }

  styles = {
    ellipsis: {
      position: 'fixed',
      visibility: 'hidden',
      top: 0,
      left: 0
    }
  }
}
