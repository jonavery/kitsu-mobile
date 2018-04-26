import React, { PureComponent } from 'react';
import { ScrollView, View, WebView, Platform, Text, ActivityIndicator, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { CustomHeader } from 'kitsu/screens/Profiles/components/CustomHeader';
import WKWebView from 'react-native-wkwebview-reborn';
import emptyComment from 'kitsu/assets/img/quick_update/comment_empty.png';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { ErrorPage } from 'kitsu/screens/Profiles/components/ErrorPage';
import { SceneLoader } from 'kitsu/components/SceneLoader';
import { StyledText, ViewMoreStyledText } from 'kitsu/components/StyledText';
import { CreatePostRow } from 'kitsu/screens/Feed/components/CreatePostRow';
import { SectionHeader } from 'kitsu/screens/Profiles/components/SectionHeader';
import { Post } from 'kitsu/screens/Feed/components/Post';
import { ImageStatus } from 'kitsu/components/ImageStatus';
import { SelectMenu } from 'kitsu/components/SelectMenu';
import { preprocessFeed } from 'kitsu/utils/preprocessFeed';
import { scenePadding } from 'kitsu/screens/Profiles/constants';
import { Kitsu } from 'kitsu/config/api';
import * as colors from 'kitsu/constants/colors';
import moment from 'moment';
import URL from 'url-parse';
import { styles } from './styles';

const WebComponent = Platform.OS === 'ios' ? WKWebView : WebView;
const LANGUAGE_LOOKUP = {
  en: 'English',
  ja: 'Japanese',
  es: 'Spanish',
};
const ITEM_WIDTH = 50;

class Unit extends PureComponent {
  static navigationOptions = ({ navigation }) => ({
    header: () => {
      const { unit } = navigation.state.params;
      const type = unit.type === 'episodes' ? 'Episodes' : 'Chapters';
      return (
        <CustomHeader
          leftButtonAction={() => navigation.goBack(null)}
          leftButtonTitle={`Back to ${type}`}
          backgroundColor={colors.listBackPurple}
        />
      );
    },
  });

  state = {
    isFeedLoading: true,
    selectedUnit: this.props.navigation.state.params.unit,
    selectedVideoIndex: 0,
    discussions: [],
  };

  componentDidMount() {
    this.fetchFeed();
  }

  fetchFeed = async () => {
    const { selectedUnit } = this.state;
    this.setState({ isFeedLoading: true });
    try {
      const posts = await Kitsu.find('episodeFeed', selectedUnit.id, {
        include: 'media,actor,unit,subject,target,target.user,target.target_user,target.spoiled_unit,target.media,target.target_group,subject.user,subject.target_user,subject.spoiled_unit,subject.media,subject.target_group,subject.followed,subject.library_entry,subject.anime,subject.manga',
        filter: { kind: 'posts' },
        page: { limit: 10, },
      });
      const discussions = preprocessFeed(posts);
      this.setState({ discussions, isFeedLoading: false });
    } catch (error) {
      console.log('Failed to fetch feed:', error);
      this.setState({ discussions: [], isFeedLoading: false });
    }
  };

  onMessage = (event) => {
    const { nativeEvent: { data } } = event;
    switch (data) {
      case 'loaded':
        const video = this.state.selectedUnit.videos[this.state.selectedVideoIndex];
        const message = { message: 'initialize', id: video.embedData.eid };
        this.webview.postMessage(JSON.stringify(message));
        break;
      default:
        console.debug('Unhandled message sent from WebView:', event.nativeEvent.data);
        break;
    }
  };

  onVideoChange = (item) => {
    // Could be a video change within the current unit or a unit change
    if (typeof item === 'number') {
      this.setState({ selectedVideoIndex: item });
    } else {
      this.setState({ selectedUnit: item, selectedVideoIndex: 0 });
      this.fetchFeed();
    }
    const video = this.state.selectedUnit.videos[this.state.selectedVideoIndex];
    const message = { message: 'change', id: video.embedData.eid };
    this.webview.postMessage(JSON.stringify(message));
  };

  getLanguageTitle = (video) => {
    const { dubLang, subLang } = video;
    if (dubLang !== 'ja') {
      return `${LANGUAGE_LOOKUP[dubLang]} Dub`;
    }
    return `${LANGUAGE_LOOKUP[subLang]} Sub`;
  };

  navigateToCreatePost = () => {
    this.props.navigation.navigate('CreatePost', {
      onNewPostCreated: this.fetchFeed,
      spoiler: true,
      spoiledUnit: this.state.selectedUnit,
      media: this.props.navigation.state.params.media,
      isMediaDisabled: true,
    });
  };

  navigateToPost = (props) => {
    this.props.navigation.navigate('PostDetails', props);
  };

  renderLoading = () => (
    <SceneLoader />
  );

  renderError = () => (
    <ErrorPage showHeader={false} />
  );

  renderPost = ({ item }) => (
    <Post
      post={item}
      onPostPress={this.navigateToPost}
      currentUser={this.props.currentUser}
      navigation={this.props.navigation}
    />
  );

  renderEmptyFeed = () => (
    <ImageStatus
      title="START THE DISCUSSION"
      text="Be the first to share your thoughts"
      image={emptyComment}
      style={{ backgroundColor: colors.listBackPurple }}
    />
  );

  getItemLayout = (data, index) => {
    const item = data[index];
    const width = item ? ITEM_WIDTH + (item.number.toString().length * 10) + 10 : ITEM_WIDTH + 20;
    return { length: width, offset: width * index, index };
  };

  renderUnit = ({ item }) => {
    const { selectedUnit, selectedVideoIndex } = this.state;
    const selectedVideo = selectedUnit.videos[selectedVideoIndex];
    const hasChildVideo = item.videos.filter(video => video === selectedVideo);
    const width = ITEM_WIDTH + (item.number.toString().length * 10);
    return (
      <TouchableOpacity
        style={[styles.unitButton, hasChildVideo.length === 1 && styles.unitButton__active, { minWidth: width, maxWidth: width }]}
        onPress={() => { this.onVideoChange(item); }}
      >
        <StyledText bold color="dark" size="small">
          {item.type === 'episodes' ? 'EP ' : 'CH '}
          {item.number}
        </StyledText>
      </TouchableOpacity>
    );
  };

  render() {
    const { isFeedLoading, selectedUnit, selectedVideoIndex, discussions } = this.state;
    const { media } = this.props.navigation.state.params;

    const hasVideo = selectedUnit.videos && selectedUnit.videos.length >= 1;
    const selectedVideo = hasVideo && selectedUnit.videos[selectedVideoIndex];

    const unitPrefix = selectedUnit.type === 'episodes' ? 'EP' : 'CH';
    const lowerUnitPrefix = selectedUnit.type === 'episodes' ? 'episode' : 'chapter';
    const releaseText = selectedUnit.type === 'episodes' ? 'Aired' : 'Published';
    let unitDate = selectedUnit.type === 'episodes' ? selectedUnit.airdate : selectedUnit.published;
    unitDate = unitDate && moment(unitDate).format('MMMM Do, YYYY');

    // Multiple video language options
    const languageOptions = hasVideo && selectedUnit.videos.map((video, index) => ({ text: this.getLanguageTitle(video), value: index }));
    if (languageOptions) { languageOptions.push('Nevermind'); }

    // Select only units that have videos
    const units = hasVideo && media.episodes.filter(item => item.videos.length >= 1);
    const unitsIndex = hasVideo && units.findIndex((item) => (
      item.videos.filter(video => video === selectedVideo).length === 1
    ));

    return (
      <ScrollView style={styles.container}>
        {/* Video */}
        {hasVideo && (
          <View style={styles.videoContainer}>
            <WebComponent
              ref={ref => { this.webview = ref; }}
              style={styles.webContainer}
              // @TODO: replace with a Kitsu-based link
              source={{ uri: 'https://reminiscent-team.surge.sh' }}
              onMessage={this.onMessage}
              renderLoading={this.renderLoading}
              renderError={this.renderError}
              // This ensures `postMessage` has been patched by React-Native
              injectedJavaScript="window.initializeHulu();"
            />
            {/* Type selector */}
            <View style={styles.languageContainer}>
              <SelectMenu
                options={languageOptions}
                onOptionSelected={this.onVideoChange}
              >
                <View style={styles.languageButton}>
                  <StyledText color="dark" size="small">{this.getLanguageTitle(selectedVideo)}</StyledText>
                </View>
              </SelectMenu>
            </View>
            {/* Unit selector */}
            <View style={styles.unitContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                data={units}
                getItemLayout={this.getItemLayout}
                initialScrollIndex={unitsIndex}
                renderItem={this.renderUnit}
              />
            </View>
          </View>
        )}

        {/* Unit information */}
        <View style={styles.metaContainer}>
          <View style={{ marginBottom: 10 }}>
            <ScrollView style={{ flexDirection: 'row' }} horizontal showsHorizontalScrollIndicator={false}>
              <StyledText color="dark" bold>{unitPrefix} {selectedUnit.number} </StyledText>
              <StyledText color="dark" numberOfLines={1}>{selectedUnit.canonicalTitle}</StyledText>
            </ScrollView>
            {unitDate && (
              <StyledText color="grey" size="xsmall">First {releaseText}: {unitDate}</StyledText>
            )}
          </View>
          <ViewMoreStyledText size="small" color="dark" ellipsizeMode="tail" numberOfLines={4}>{selectedUnit.synopsis}</ViewMoreStyledText>
        </View>

        {/* Feed */}
        <View>
          <View style={{ marginHorizontal: 10, marginVertical: 15 }}>
            <CreatePostRow
              title={`What did you think of this ${lowerUnitPrefix}?`}
              onPress={this.navigateToCreatePost}
              style={{ borderRadius: 6 }}
            />
          </View>
          <View style={{ paddingVertical: scenePadding }}>
            <SectionHeader title="Discussion" />
            {isFeedLoading ? (
              this.renderLoading()
            ) : (
              <KeyboardAwareFlatList
                data={discussions}
                keyExtractor={item => item.id}
                renderItem={this.renderPost}
                ListEmptyComponent={this.renderEmptyFeed}
              />
            )}
          </View>
        </View>
      </ScrollView>
    );
  }
};

const mapStateToProps = ({ user }) => {
  const { currentUser } = user;
  return { currentUser };
};

export default connect(mapStateToProps)(Unit);
