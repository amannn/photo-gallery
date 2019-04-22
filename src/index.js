import React from 'react';
import ReactDOM from 'react-dom';
import PhotoGallery from './components/PhotoGallery';
import album from './photos';

ReactDOM.render(
  <PhotoGallery album={album} />,
  document.getElementById('root')
);
