import React from 'react';
import { View, TouchableOpacity, ViewPropTypes } from 'react-native';
import { StyledText } from 'kitsu/components/StyledText';
import PropTypes from 'prop-types';
import { styles } from './styles';

export const MediaTag = ({ disabled, media, episode, navigation, style }) => {
  const episodePrefix = media.type === 'anime' ? 'E' : 'CH';
  return (
    <View style={[styles.mediaTagView, style]}>
      <TouchableOpacity
        disabled={disabled}
        onPress={() =>
          navigation.navigate('MediaPages', { mediaId: media.id, mediaType: media.type })}
        style={styles.mediaTag}
      >
        <StyledText color="green" size="xxsmall">
          {media.canonicalTitle}
        </StyledText>
      </TouchableOpacity>
      {episode && (
        <TouchableOpacity
          disabled={disabled}
          onPress={() =>
            navigation.navigate('MediaPages', { mediaId: media.id, mediaType: media.type })}
          style={styles.episodeTagView}
        >
          <View style={styles.episodeTagLine} />
          <View style={styles.mediaTag}>
            <StyledText color="green" size="xxsmall">{`${episodePrefix} ${episode.number}`}</StyledText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

MediaTag.propTypes = {
  media: PropTypes.shape({
    canonicalTitle: PropTypes.string.isRequired,
  }).isRequired,
  episode: PropTypes.shape({
    number: PropTypes.number.isRequired,
  }),
  navigation: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  style: ViewPropTypes.style,
};

MediaTag.defaultProps = {
  episode: null,
  disabled: false,
  style: null,
};
