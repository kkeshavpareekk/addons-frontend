/* @flow */
/* eslint-disable react/sort-comp */
import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';

import AddonReview from 'amo/components/AddonReview';
import { withErrorHandler } from 'core/errorHandler';
import translate from 'core/i18n/translate';
import log from 'core/logger';
import { isAuthenticated } from 'core/reducers/user';
import { isAddonAuthor, nl2br, sanitizeHTML } from 'core/utils';
import {
  hideEditReviewForm,
  hideReplyToReviewForm,
  sendReplyToReview,
  showEditReviewForm,
  showReplyToReviewForm,
} from 'amo/actions/reviews';
import Icon from 'ui/components/Icon';
import LoadingText from 'ui/components/LoadingText';
import Rating from 'ui/components/Rating';
import DismissibleTextForm from 'ui/components/DismissibleTextForm';
import type { UserReviewType } from 'amo/actions/reviews';
import type { ReviewState } from 'amo/reducers/reviews';
import type { ErrorHandlerType } from 'core/errorHandler';
import type { UserStateType } from 'core/reducers/user';
import type { AddonType } from 'core/types/addons';
import type { DispatchFunc } from 'core/types/redux';
import type { OnSubmitParams } from 'ui/components/DismissibleTextForm';

import './styles.scss';

type PropsType = {|
  addon?: AddonType,
  editingReview: boolean,
  dispatch: DispatchFunc,
  errorHandler: ErrorHandlerType,
  isAuthenticated: boolean,
  isReplyToReviewId?: number,
  i18n: Object,
  review?: UserReviewType,
  replyingToReview: boolean,
  siteUser: UserStateType,
  submittingReply: boolean,
|};

export class AddonReviewListItemBase extends React.Component {
  props: PropsType;

  onClickToEditReview = (event: SyntheticEvent) => {
    const { dispatch, isReplyToReviewId, review } = this.props;
    event.preventDefault();

    if (isReplyToReviewId !== undefined) {
      dispatch(showReplyToReviewForm({ reviewId: isReplyToReviewId }));
    } else {
      if (!review) {
        log.debug(
          'Cannot edit a review because no review has been loaded.');
        return;
      }
      dispatch(showEditReviewForm({ reviewId: review.id }));
    }
  }

  onEscapeReviewOverlay = () => {
    const { dispatch, review } = this.props;
    if (!review) {
      log.debug(
        'Cannot hide review form because no review has been loaded.');
      return;
    }
    // Even though an escaped overlay will be hidden, we still have to
    // synchronize our show/hide state otherwise we won't be able to
    // show the overlay after it has been escaped.
    dispatch(hideEditReviewForm({ reviewId: review.id }));
  }

  onReviewSubmitted = () => {
    const { dispatch, review } = this.props;
    if (!review) {
      log.debug(
        'Cannot hide review form because no review has been loaded.');
      return;
    }
    dispatch(hideEditReviewForm({ reviewId: review.id }));
  }

  onClickToBeginReviewReply = (event: SyntheticEvent) => {
    event.preventDefault();
    const { dispatch, review } = this.props;
    if (!review) {
      log.debug(
        'Cannot show review form because no review has been loaded.');
      return;
    }
    dispatch(showReplyToReviewForm({ reviewId: review.id }));
  }

  onDismissReviewReply = () => {
    const { dispatch, review } = this.props;
    if (!review) {
      log.debug(
        'Cannot hide review form because no review has been loaded.');
      return;
    }
    dispatch(hideReplyToReviewForm({ reviewId: review.id }));
  }

  onSubmitReviewReply = (reviewData: OnSubmitParams) => {
    const { dispatch, errorHandler, review } = this.props;
    if (!review) {
      throw new Error(
        'The review property cannot be empty when replying to a review');
    }

    dispatch(sendReplyToReview({
      errorHandlerId: errorHandler.id,
      originalReviewId: review.id,
      body: reviewData.text,
    }));
  }

  renderReply() {
    const {
      addon,
      errorHandler,
      i18n,
      replyingToReview,
      review,
      submittingReply,
    } = this.props;

    if (!review || (!review.reply && !replyingToReview)) {
      return null;
    }

    return (
      <div className="AddonReviewListItem-reply">
        <h4 className="AddonReviewListItem-reply-header">
          <Icon name="reply-arrow" />
          {i18n.gettext('Developer response')}
        </h4>
        {replyingToReview ? (
          <DismissibleTextForm
            className="AddonReviewListItem-reply-form"
            isSubmitting={submittingReply && !errorHandler.hasError()}
            onDismiss={this.onDismissReviewReply}
            onSubmit={this.onSubmitReviewReply}
            placeholder={i18n.gettext('Write a reply to this review.')}
            submitButtonText={
              review.reply ?
                i18n.gettext('Update reply') :
                i18n.gettext('Publish reply')
            }
            submitButtonInProgressText={
              review.reply ?
                i18n.gettext('Updating reply') :
                i18n.gettext('Publishing reply')
            }
            text={review.reply && review.reply.body}
          />
        ) : (
          <AddonReviewListItem
            addon={addon}
            isReplyToReviewId={review.id}
            review={review.reply}
          />
        )}
      </div>
    );
  }

  render() {
    const {
      addon,
      editingReview,
      errorHandler,
      i18n,
      isAuthenticated: userIsAuthenticated,
      isReplyToReviewId,
      replyingToReview,
      review,
      siteUser,
    } = this.props;

    let byline;
    let reviewBody;
    const reviewBodyClass = 'AddonReviewListItem-body';
    const isReply = isReplyToReviewId !== undefined;

    if (review) {
      const timestamp = i18n.moment(review.created).fromNow();
      if (isReply) {
        // translators: Example in English: "posted last week"
        byline = i18n.sprintf(
          i18n.gettext('posted %(timestamp)s'), { timestamp });
      } else {
        // translators: Example in English: "from UserName123, last week"
        byline = i18n.sprintf(
          i18n.gettext('by %(authorName)s, %(timestamp)s'),
          { authorName: review.userName, timestamp });
      }

      const reviewBodySanitized = sanitizeHTML(
        nl2br(review.body), ['br']
      );
      /* eslint-disable react/no-danger */
      reviewBody = (
        <p
          className={reviewBodyClass}
          dangerouslySetInnerHTML={reviewBodySanitized}
        />
      );
      /* eslint-enable react/no-danger */
    } else {
      byline = <LoadingText />;
      reviewBody = <p className={reviewBodyClass}><LoadingText /></p>;
    }

    return (
      <div className="AddonReviewListItem">
        <h3 className="AddonReviewListItem-review-header">
          {review ? review.title : <LoadingText />}
        </h3>
        {reviewBody}
        <div className="AddonReviewListItem-byline">
          {review && !isReply ?
            <Rating styleName="small" rating={review.rating} readOnly />
            : null
          }
          {byline}
          {
            userIsAuthenticated && review &&
            review.userId === siteUser.id ?
              (
                <div>
                  {/* This will render an overlay to edit the review */}
                  {editingReview ?
                    <AddonReview
                      onEscapeOverlay={this.onEscapeReviewOverlay}
                      onReviewSubmitted={this.onReviewSubmitted}
                      review={review}
                    />
                    : null
                  }
                  <a
                    href="#edit"
                    onClick={this.onClickToEditReview}
                    className="AddonReviewListItem-edit AddonReviewListItem-control"
                  >
                    {isReply ?
                      i18n.gettext('Edit my reply') :
                      i18n.gettext('Edit my review')
                    }
                  </a>
                </div>
              ) : null
          }
          {
            review && addon && siteUser &&
            !replyingToReview && !review.reply &&
            isAddonAuthor({ addon, userId: siteUser.id }) &&
            review.userId !== siteUser.id ?
              (
                <a
                  href="#reply"
                  onClick={this.onClickToBeginReviewReply}
                  className="AddonReviewListItem-begin-reply AddonReviewListItem-control"
                >
                  <Icon name="reply-arrow" />
                  {i18n.gettext('Reply to this review')}
                </a>
              ) : null
          }
        </div>
        {errorHandler.renderErrorIfPresent()}
        {this.renderReply()}
      </div>
    );
  }
}

export function mapStateToProps(
  state: {| user: UserStateType, reviews: ReviewState |},
  ownProps: PropsType,
) {
  let editingReview = false;
  let replyingToReview = false;
  let submittingReply = false;
  if (ownProps.review) {
    const view = state.reviews.view[ownProps.review.id];
    if (view) {
      editingReview = view.editingReview;
      replyingToReview = view.replyingToReview;
      submittingReply = view.submittingReply;
    }
  }
  return {
    editingReview,
    isAuthenticated: isAuthenticated(state),
    replyingToReview,
    siteUser: state.user,
    submittingReply,
  };
}

const AddonReviewListItem = compose(
  connect(mapStateToProps),
  withErrorHandler({ name: 'AddonReviewListItem' }),
  translate({ withRef: true }),
)(AddonReviewListItemBase);

export default AddonReviewListItem;
