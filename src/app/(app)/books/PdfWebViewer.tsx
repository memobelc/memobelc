import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

const PdfWebViewer = ({ route }: any) => {
  const pdfUri =
    'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fbook_1_-_oxford_dominoes_quick_starter_ali_baba_and_the_forty_thieves.pdf?alt=media&token=8ee581e0-7ce0-447c-92eb-1684fc1c0ba5';

  // Encaminha o link para o Google Docs Viewer
  const googleDocsUri = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUri)}`;

  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: googleDocsUri }} style={{ flex: 1 }} />
    </View>
  );
};

export default PdfWebViewer;
